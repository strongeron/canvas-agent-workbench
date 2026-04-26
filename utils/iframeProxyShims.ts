/**
 * Shims injected into HTML proxied through `/api/proxy/<port>/` so that pages
 * rendered inside Canvas iframes behave like they would in a top-level tab.
 *
 * Problem (1): Chromium computes `IntersectionObserver` `rootBounds` (when
 * `root` is `null`) against the *parent* document's visible viewport, not
 * the iframe's own viewport. Canvas iframes can be 1918×8242 while the real
 * Chrome viewport is ~1716×953, so anything below the canvas viewport is
 * reported `isIntersecting: false` and IO-gated reveals never fire.
 *
 * Problem (2): Canvas often renders iframes off-screen, scaled down, or
 * inside `transform: scale(...)` artboards. Chrome throttles
 * `requestAnimationFrame` and even native IO callbacks for iframes whose
 * pixels are not visible to the user — so any RAF/threshold-aware polyfill
 * we ship is also throttled into uselessness.
 *
 * Approach: replace `IntersectionObserver` with a "preview-mode" stub. For
 * every observed element it synchronously schedules a callback (via both
 * setTimeout(0) and queueMicrotask, neither of which Chrome throttles for
 * same-origin iframes) that reports `isIntersecting: true, ratio: 1`. This
 * unblocks every common pattern used in modern web apps:
 *   - `react-intersection-observer` (`threshold: 0.45`, etc.)
 *   - `framer-motion` `whileInView`
 *   - Custom `useEffect` IO hooks (the AppSignal AntiSell pattern)
 *   - `loading="lazy"` IO observers used by Next/Image, etc.
 *
 * Trade-off: animations that pause when out of view will stay running, and
 * lazy-loaded content will load eagerly. For a static canvas preview that's
 * the desired outcome.
 *
 * Observers with an explicit `root` pass through to the native implementation
 * unchanged (those are scoped to a specific element and Chrome handles them
 * fine).
 *
 * Apply this to any new iframe surface that ferries third-party / app-shell
 * HTML into Canvas (proxy, srcdoc bundles, etc.).
 */

const INTERSECTION_OBSERVER_SHIM = `
<script data-canvas-iframe-shim="intersection-observer">
(function () {
  if (window.top === window) return;
  if (window.__canvasIOShimInstalled) return;
  window.__canvasIOShimInstalled = true;

  var Native = window.IntersectionObserver;
  var allObservers = new Set();
  var stats = {
    observerCount: 0,
    observeCalls: 0,
    fireCalls: 0,
    lastFireAt: 0,
    forcedFireCalls: 0,
    listenerHits: 0
  };
  window.__canvasShim_observers = allObservers;
  window.__canvasShim_stats = stats;

  function parseThresholds(t) {
    if (t == null) return [0];
    if (Array.isArray(t)) return t.length ? t.slice().sort(function (a, b) { return a - b; }) : [0];
    return [t];
  }

  function viewportRect() {
    var de = document.documentElement;
    var body = document.body;
    var w = Math.max(window.innerWidth || 0, de ? de.scrollWidth : 0, body ? body.scrollWidth : 0);
    var h = Math.max(window.innerHeight || 0, de ? de.scrollHeight : 0, body ? body.scrollHeight : 0);
    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h };
  }

  function entryFor(target) {
    var br;
    try { br = target.getBoundingClientRect(); }
    catch (e) { br = { x:0,y:0,top:0,left:0,right:0,bottom:0,width:0,height:0 }; }
    return {
      target: target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: br,
      rootBounds: viewportRect(),
      intersectionRect: br,
      time: performance.now ? performance.now() : Date.now()
    };
  }

  function ShimObserver(callback, options) {
    var opts = options || {};
    if (opts.root != null && Native) {
      return new Native(callback, opts);
    }

    var targets = new Set();
    var instance;
    var firedOnce = new WeakSet();

    function fireAll(reason) {
      if (!targets.size) return;
      var entries = [];
      targets.forEach(function (el) { entries.push(entryFor(el)); });
      stats.fireCalls++;
      stats.lastFireAt = Date.now();
      try { callback(entries, instance); } catch (e) { /* swallow */ }
      targets.forEach(function (el) { firedOnce.add(el); });
    }

    function scheduleFire() {
      // Inside the iframe Chrome can heavily throttle setTimeout when the
      // iframe is not actually painting visible pixels (Canvas artboards are
      // often scaled / offscreen). We schedule defensively, but the real
      // safety net is window.__canvasShim_forceFire() called from the parent.
      try { queueMicrotask(function () { fireAll('microtask'); }); } catch (e) {}
      setTimeout(function () { fireAll('timeout-0'); }, 0);
      setTimeout(function () { fireAll('timeout-250'); }, 250);
    }

    instance = {
      root: null,
      rootMargin: opts.rootMargin || '0px',
      thresholds: parseThresholds(opts.threshold),
      observe: function (el) {
        if (!el || targets.has(el)) return;
        stats.observeCalls++;
        targets.add(el);
        scheduleFire();
      },
      unobserve: function (el) { targets.delete(el); },
      disconnect: function () {
        targets.clear();
        allObservers.delete(instance);
      },
      takeRecords: function () { return []; },
      // Internal: re-fire all observed targets.
      __canvasShim_fire: function () { fireAll('forced'); }
    };
    allObservers.add(instance);
    stats.observerCount++;
    return instance;
  }

  // Force-fire every observer's callback. Designed to be invoked from the
  // parent window, whose main thread is not throttled by Chrome the same way
  // an offscreen iframe's is.
  window.__canvasShim_forceFire = function () {
    stats.forcedFireCalls++;
    var fired = 0;
    allObservers.forEach(function (obs) {
      try {
        if (typeof obs.__canvasShim_fire === 'function') {
          obs.__canvasShim_fire();
          fired++;
        }
      } catch (e) { /* swallow */ }
    });
    return { observers: allObservers.size, fired: fired, stats: stats };
  };

  // DOM-level escape hatch for canvas previews where the page's own JS never
  // finishes running (e.g. React effects interrupted mid-execution by Chrome's
  // intensive throttling on offscreen iframes). Walk the document, find every
  // element stuck in a "before" state (opacity:0 + animate-none) and force it
  // to its "after" state via inline styles. Inline styles win against Tailwind
  // classes; React's reconciler only patches className, so it leaves these
  // inline overrides alone on subsequent re-renders.
  var REVEAL_MARKER = '__canvasShim_revealed';
  function revealHiddenElements() {
    var revealed = 0;
    var inspected = 0;
    var els = document.querySelectorAll('[class*="opacity-0"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!(el instanceof HTMLElement)) continue;
      inspected++;
      if (el.dataset && el.dataset[REVEAL_MARKER] === '1') continue;
      var cs = getComputedStyle(el);
      if (cs.opacity !== '0') continue;
      el.style.setProperty('opacity', '1', 'important');
      // If the element is a Tailwind 'animate-[...]'-style reveal, scrape the
      // keyframe name out of its className and apply it inline so the entry
      // animation still runs. Falls back to opacity flip if no match.
      var cls = (el.className && el.className.toString && el.className.toString()) || '';
      var match = cls.match(/animate-\\[([^\\]]+)\\]/);
      if (match && match[1]) {
        // The bracket value is e.g. "antiAppear-fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards".
        var animValue = match[1].replace(/_/g, ' ');
        el.style.setProperty('animation', animValue, 'important');
      }
      el.dataset[REVEAL_MARKER] = '1';
      revealed++;
    }
    return { inspected: inspected, revealed: revealed };
  }
  window.__canvasShim_revealHidden = revealHiddenElements;

  // Listen for parent-driven nudges (postMessage doesn't go through the
  // throttled timer queue, so it survives intensive throttling).
  window.addEventListener('message', function (event) {
    if (event && event.data && event.data.__canvasShim === 'forceFire') {
      stats.listenerHits++;
      window.__canvasShim_forceFire();
    }
  });

  if (Native && Native.prototype) ShimObserver.prototype = Native.prototype;
  window.IntersectionObserver = ShimObserver;
})();
</script>
`.trim()

const COMBINED_SHIM = INTERSECTION_OBSERVER_SHIM

/**
 * Inject Canvas-iframe shims into a proxied HTML document. Idempotent: a
 * marker comment prevents double-injection if the proxy is chained.
 */
export function injectIframeProxyShims(html: string): string {
  if (html.includes('data-canvas-iframe-shim=')) return html

  const headOpen = html.match(/<head[^>]*>/i)
  if (headOpen && headOpen.index != null) {
    const insertAt = headOpen.index + headOpen[0].length
    return html.slice(0, insertAt) + '\n' + COMBINED_SHIM + html.slice(insertAt)
  }

  // No <head> — prepend so the shim still runs before page scripts.
  const htmlOpen = html.match(/<html[^>]*>/i)
  if (htmlOpen && htmlOpen.index != null) {
    const insertAt = htmlOpen.index + htmlOpen[0].length
    return html.slice(0, insertAt) + '\n' + COMBINED_SHIM + html.slice(insertAt)
  }

  return COMBINED_SHIM + '\n' + html
}
