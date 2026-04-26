import { Check, ChevronDown, ChevronRight, Copy, RotateCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

interface CanvasEmbedDebugSectionProps {
  embedId: string
  url?: string
  useProxy?: boolean
  proxyUrl?: string | null
}

interface AnimationRecord {
  name: string
  state: string
  target: string
}

interface ElementGroupRecord {
  selector: string
  count: number
  sample?: {
    tag: string
    classes: string
    opacity: string
    animationName: string
    rectTop: number
    rectHeight: number
  }
}

interface DebugSnapshot {
  capturedAt: number
  iframeFound: boolean
  sameOrigin: boolean
  iframeSrcAttr?: string
  iframeLocationHref?: string
  iframeLocationOrigin?: string
  iframeSize?: { width: number; height: number }
  innerSize?: { width: number; height: number }
  docScrollSize?: { width: number; height: number }
  readyState?: DocumentReadyState
  docTitle?: string
  htmlLength?: number
  bodyInnerHTMLLength?: number
  bodyTextLength?: number
  totalElements?: number
  topLevelChildren?: Array<{ tag: string; classes: string; childCount: number }>
  scriptsCount?: number
  stylesheetsCount?: number
  metaTags?: Array<{ name?: string; httpEquiv?: string; charset?: string; content?: string }>
  shimInstalled?: boolean
  shimStats?: {
    observerCount: number
    observeCalls: number
    fireCalls: number
    lastFireAt: number
    forcedFireCalls: number
    listenerHits: number
  }
  ioConstructor?: string
  hasResizeObserver?: boolean
  hasGsap?: boolean
  hasFramerMotion?: boolean
  hasLottie?: boolean
  hasScrollTrigger?: boolean
  prefersReducedMotion?: boolean
  animationsTotal?: number
  animations?: AnimationRecord[]
  elementGroups?: ElementGroupRecord[]
  consoleErrors?: number
  errorMessage?: string
}

interface AllIframesSnapshot {
  capturedAt: number
  count: number
  iframes: Array<DebugSnapshot & { embedId?: string }>
}

const ELEMENT_GROUP_QUERIES: Array<{ selector: string; label: string }> = [
  { selector: '[class*="anti"]', label: "anti" },
  { selector: '[class*="animate-"], [class*="anim"]', label: "animate-*" },
  { selector: '[class*="fade"]', label: "fade-*" },
  { selector: '[class*="reveal"]', label: "reveal-*" },
  { selector: '[class*="motion"]', label: "motion-*" },
  { selector: '[data-animate], [data-inview], [data-aos]', label: "data-animate" },
]

function describeTarget(target: unknown): string {
  if (!target || typeof target !== "object") return ""
  const el = target as Element
  if (typeof el.tagName !== "string") return ""
  const cls = typeof el.className === "string" ? el.className.slice(0, 80) : ""
  return `${el.tagName}${cls ? "." + cls.trim().replace(/\s+/g, ".") : ""}`
}

function captureSnapshotForIframe(iframe: HTMLIFrameElement): DebugSnapshot {
  const snapshot: DebugSnapshot = {
    capturedAt: Date.now(),
    iframeFound: true,
    sameOrigin: false,
  }
  snapshot.iframeSrcAttr = iframe.getAttribute("src") || iframe.src
  snapshot.iframeSize = {
    width: Math.round(iframe.clientWidth),
    height: Math.round(iframe.clientHeight),
  }

  let win: Window | null
  let doc: Document | null
  try {
    win = iframe.contentWindow
    doc = iframe.contentDocument
  } catch (error) {
    snapshot.errorMessage = `Cross-origin: ${(error as Error).message}`
    return snapshot
  }
  if (!win || !doc) {
    snapshot.errorMessage = "Iframe contentWindow / contentDocument not available."
    return snapshot
  }

  try {
    const probe = win.location.href
    if (typeof probe !== "string") throw new Error("location unreadable")
    snapshot.iframeLocationHref = probe
    snapshot.iframeLocationOrigin = win.location.origin
    snapshot.sameOrigin = true
  } catch (error) {
    snapshot.errorMessage = `Cross-origin: ${(error as Error).message}`
    return snapshot
  }

  try {
    snapshot.innerSize = { width: win.innerWidth, height: win.innerHeight }
    const de = doc.documentElement
    const body = doc.body
    snapshot.docScrollSize = {
      width: Math.max(de?.scrollWidth ?? 0, body?.scrollWidth ?? 0),
      height: Math.max(de?.scrollHeight ?? 0, body?.scrollHeight ?? 0),
    }
    snapshot.readyState = doc.readyState
    snapshot.docTitle = doc.title
    snapshot.htmlLength = de?.outerHTML?.length ?? 0
    snapshot.bodyInnerHTMLLength = body?.innerHTML?.length ?? 0
    snapshot.bodyTextLength = (body?.innerText ?? body?.textContent ?? "").length
    snapshot.totalElements = doc.getElementsByTagName("*").length
    snapshot.topLevelChildren = body
      ? Array.from(body.children)
          .slice(0, 10)
          .map((c) => ({
            tag: c.tagName,
            classes: (c.className?.toString?.() ?? "").slice(0, 120),
            childCount: c.children.length,
          }))
      : []
    snapshot.scriptsCount = doc.querySelectorAll("script").length
    snapshot.stylesheetsCount = doc.styleSheets.length
    snapshot.metaTags = Array.from(doc.querySelectorAll("meta"))
      .slice(0, 12)
      .map((m) => ({
        name: m.getAttribute("name") || undefined,
        httpEquiv: m.getAttribute("http-equiv") || undefined,
        charset: m.getAttribute("charset") || undefined,
        content: m.getAttribute("content")?.slice(0, 80) || undefined,
      }))
    const winAny = win as unknown as Record<string, unknown>
    snapshot.shimInstalled = Boolean(winAny.__canvasIOShimInstalled)
    if (winAny.__canvasShim_stats && typeof winAny.__canvasShim_stats === "object") {
      snapshot.shimStats = winAny.__canvasShim_stats as DebugSnapshot["shimStats"]
    }
    const IO = winAny.IntersectionObserver as { name?: string } | undefined
    snapshot.ioConstructor = IO?.name ?? "(absent)"
    snapshot.hasResizeObserver = typeof winAny.ResizeObserver === "function"
    snapshot.hasGsap = Boolean(winAny.gsap)
    snapshot.hasFramerMotion = Boolean(winAny.FramerMotion || winAny.framerMotion || winAny.motion)
    snapshot.hasLottie = Boolean(winAny.lottie || winAny.bodymovin)
    snapshot.hasScrollTrigger = Boolean(
      winAny.ScrollTrigger ||
        (typeof winAny.gsap === "object" &&
          winAny.gsap !== null &&
          (winAny.gsap as Record<string, unknown>).ScrollTrigger)
    )
    snapshot.prefersReducedMotion = win
      .matchMedia("(prefers-reduced-motion: reduce)")
      .matches

    const anims = typeof doc.getAnimations === "function" ? doc.getAnimations() : []
    snapshot.animationsTotal = anims.length
    snapshot.animations = anims.slice(0, 12).map((a) => {
      const cssAnim = a as unknown as { animationName?: string }
      const effectTarget = a.effect && "target" in a.effect ? (a.effect as KeyframeEffect).target : null
      return {
        name: cssAnim.animationName || a.constructor.name,
        state: a.playState,
        target: describeTarget(effectTarget),
      }
    })

    snapshot.elementGroups = ELEMENT_GROUP_QUERIES.map(({ selector, label }) => {
      const els = doc.querySelectorAll(selector)
      const sample = els[0] as HTMLElement | undefined
      if (!sample) return { selector: label, count: 0 }
      const cs = win.getComputedStyle(sample)
      const rect = sample.getBoundingClientRect()
      return {
        selector: label,
        count: els.length,
        sample: {
          tag: sample.tagName,
          classes: (sample.className?.toString?.() ?? "").slice(0, 200),
          opacity: cs.opacity,
          animationName: cs.animationName,
          rectTop: Math.round(rect.top),
          rectHeight: Math.round(rect.height),
        },
      }
    })
  } catch (error) {
    snapshot.errorMessage = `Inspection failed: ${(error as Error).message}`
  }

  return snapshot
}

function captureSnapshot(embedId: string): DebugSnapshot {
  const iframe = document.querySelector(
    `iframe[data-canvas-embed-id="${CSS.escape(embedId)}"]`
  ) as HTMLIFrameElement | null
  if (!iframe) {
    return {
      capturedAt: Date.now(),
      iframeFound: false,
      sameOrigin: false,
      errorMessage: "No iframe with this embed id found in the DOM.",
    }
  }
  return captureSnapshotForIframe(iframe)
}

function captureAllIframes(): AllIframesSnapshot {
  const iframes = Array.from(document.querySelectorAll("iframe")) as HTMLIFrameElement[]
  return {
    capturedAt: Date.now(),
    count: iframes.length,
    iframes: iframes.map((f) => ({
      ...captureSnapshotForIframe(f),
      embedId: f.getAttribute("data-canvas-embed-id") || undefined,
    })),
  }
}

function formatNum(n?: number): string {
  return typeof n === "number" ? n.toString() : "—"
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  )
}

export function CanvasEmbedDebugSection({
  embedId,
  url,
  useProxy,
  proxyUrl,
}: CanvasEmbedDebugSectionProps) {
  const [open, setOpen] = useState(true)
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [autoForceFire, setAutoForceFire] = useState(false)
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle")
  const [forceFireResult, setForceFireResult] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)
  const forceFireIntervalRef = useRef<number | null>(null)
  const copyTimeoutRef = useRef<number | null>(null)

  const refresh = useCallback(() => {
    setSnapshot(captureSnapshot(embedId))
  }, [embedId])

  const writeClipboard = useCallback(async (payload: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = payload
        textarea.setAttribute("readonly", "true")
        textarea.style.position = "absolute"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopyState("ok")
    } catch {
      setCopyState("err")
    }
    if (copyTimeoutRef.current != null) window.clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = window.setTimeout(() => setCopyState("idle"), 1500)
  }, [])

  const handleCopy = useCallback(async () => {
    const fresh = captureSnapshot(embedId)
    setSnapshot(fresh)
    await writeClipboard(JSON.stringify(fresh, null, 2))
  }, [embedId, writeClipboard])

  const handleCopyAll = useCallback(async () => {
    const all = captureAllIframes()
    await writeClipboard(JSON.stringify(all, null, 2))
  }, [writeClipboard])

  const handleForceFire = useCallback(() => {
    const iframe = document.querySelector(
      `iframe[data-canvas-embed-id="${CSS.escape(embedId)}"]`
    ) as HTMLIFrameElement | null
    if (!iframe) {
      setForceFireResult("iframe not found")
      return
    }
    const win = iframe.contentWindow as unknown as
      | { __canvasShim_forceFire?: () => { observers: number; fired: number } }
      | null
    try {
      if (win?.__canvasShim_forceFire) {
        const result = win.__canvasShim_forceFire()
        setForceFireResult(`fired ${result.fired}/${result.observers}`)
      } else {
        iframe.contentWindow?.postMessage({ __canvasShim: "forceFire" }, "*")
        setForceFireResult("postMessage sent (no direct access)")
      }
      setSnapshot(captureSnapshot(embedId))
    } catch (error) {
      setForceFireResult(`error: ${(error as Error).message}`)
    }
  }, [embedId])

  const handleRevealHidden = useCallback(() => {
    const iframe = document.querySelector(
      `iframe[data-canvas-embed-id="${CSS.escape(embedId)}"]`
    ) as HTMLIFrameElement | null
    if (!iframe) {
      setForceFireResult("iframe not found")
      return
    }
    const win = iframe.contentWindow as unknown as
      | { __canvasShim_revealHidden?: () => { inspected: number; revealed: number } }
      | null
    try {
      if (win?.__canvasShim_revealHidden) {
        const result = win.__canvasShim_revealHidden()
        setForceFireResult(`revealed ${result.revealed}/${result.inspected} hidden el`)
      } else {
        setForceFireResult("revealHidden unavailable (shim not installed)")
      }
      setSnapshot(captureSnapshot(embedId))
    } catch (error) {
      setForceFireResult(`error: ${(error as Error).message}`)
    }
  }, [embedId])

  useEffect(() => {
    if (forceFireIntervalRef.current != null) {
      window.clearInterval(forceFireIntervalRef.current)
      forceFireIntervalRef.current = null
    }
    if (autoForceFire && open) {
      forceFireIntervalRef.current = window.setInterval(handleForceFire, 1000)
    }
    return () => {
      if (forceFireIntervalRef.current != null) {
        window.clearInterval(forceFireIntervalRef.current)
        forceFireIntervalRef.current = null
      }
    }
  }, [autoForceFire, open, handleForceFire])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current != null) window.clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    refresh()
  }, [open, refresh])

  useEffect(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (autoRefresh && open) {
      intervalRef.current = window.setInterval(refresh, 1000)
    }
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoRefresh, open, refresh])

  const proxyHref = useProxy && proxyUrl ? proxyUrl : null
  const summary = useMemo(() => {
    if (!snapshot) return null
    return {
      shimOk: snapshot.shimInstalled === true,
      ioOk: snapshot.ioConstructor === "ShimObserver",
      hasAnims: (snapshot.animationsTotal ?? 0) > 0,
    }
  }, [snapshot])

  return (
    <div className="rounded-md border border-default bg-white text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Debug
        </span>
        {summary ? (
          <span className="flex items-center gap-1">
            <StatusPill ok={summary.shimOk} label="shim" />
            <StatusPill ok={summary.hasAnims} label="anim" />
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="space-y-3 px-3 pb-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
            >
              <RotateCw className="h-3 w-3" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy this iframe's debug payload (JSON)"
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-surface-100 ${
                copyState === "ok"
                  ? "border-emerald-300 text-emerald-700"
                  : copyState === "err"
                    ? "border-red-300 text-red-700"
                    : "border-default text-foreground"
              }`}
            >
              {copyState === "ok" ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : copyState === "err" ? (
                <>
                  <Copy className="h-3 w-3" />
                  Failed
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyAll}
              title="Copy debug payloads for ALL iframes on the canvas (JSON)"
              className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
            >
              <Copy className="h-3 w-3" />
              Copy all
            </button>
            <button
              type="button"
              onClick={handleForceFire}
              title="Re-invoke every shim observer's callback from the parent window — bypasses iframe throttling"
              className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
            >
              <RotateCw className="h-3 w-3" />
              Force fire
            </button>
            <button
              type="button"
              onClick={handleRevealHidden}
              title="DOM-level escape hatch: walks the iframe and force-reveals every element stuck at opacity:0 (inline style overrides Tailwind). Use when the page's own JS isn't running in canvas previews."
              className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
            >
              <RotateCw className="h-3 w-3" />
              Reveal hidden
            </button>
            <label className="flex items-center gap-1 text-[11px]">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto (1s)
            </label>
            <label
              className="flex items-center gap-1 text-[11px]"
              title="Re-fire every shim observer once per second from the parent. If reveals start playing while this is on, iframe-level throttling is the cause."
            >
              <input
                type="checkbox"
                checked={autoForceFire}
                onChange={(e) => setAutoForceFire(e.target.checked)}
              />
              Auto force-fire
            </label>
            {proxyHref ? (
              <a
                href={proxyHref}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-[11px] text-brand-600 hover:text-brand-700"
              >
                Open proxy
              </a>
            ) : null}
          </div>

          {!snapshot ? (
            <p className="text-[11px] italic text-muted-foreground">No data yet.</p>
          ) : !snapshot.iframeFound ? (
            <p className="text-[11px] text-red-600">{snapshot.errorMessage || "Iframe not found."}</p>
          ) : !snapshot.sameOrigin ? (
            <p className="text-[11px] text-red-600">
              {snapshot.errorMessage || "Cross-origin iframe — enable proxy mode to inspect."}
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-muted-foreground">src attr</dt>
                <dd className="truncate text-foreground" title={snapshot.iframeSrcAttr}>
                  {snapshot.iframeSrcAttr?.replace(/^https?:\/\/[^/]+/, "")}
                </dd>

                <dt className="text-muted-foreground">location</dt>
                <dd className="truncate text-foreground" title={snapshot.iframeLocationHref}>
                  {snapshot.iframeLocationHref?.replace(/^https?:\/\/[^/]+/, "") || "—"}
                </dd>

                <dt className="text-muted-foreground">Iframe size</dt>
                <dd className="text-foreground">
                  {formatNum(snapshot.iframeSize?.width)}×{formatNum(snapshot.iframeSize?.height)}
                </dd>

                <dt className="text-muted-foreground">Inner size</dt>
                <dd className="text-foreground">
                  {formatNum(snapshot.innerSize?.width)}×{formatNum(snapshot.innerSize?.height)}
                </dd>

                <dt className="text-muted-foreground">Doc scroll</dt>
                <dd className="text-foreground">
                  {formatNum(snapshot.docScrollSize?.width)}×{formatNum(snapshot.docScrollSize?.height)}
                </dd>

                <dt className="text-muted-foreground">Ready state</dt>
                <dd className="text-foreground">{snapshot.readyState}</dd>

                <dt className="text-muted-foreground">Doc title</dt>
                <dd className="truncate text-foreground" title={snapshot.docTitle}>
                  {snapshot.docTitle || "—"}
                </dd>

                <dt className="text-muted-foreground">HTML / body bytes</dt>
                <dd className="text-foreground">
                  {formatNum(snapshot.htmlLength)} / {formatNum(snapshot.bodyInnerHTMLLength)}
                </dd>

                <dt className="text-muted-foreground">DOM elements</dt>
                <dd className="text-foreground">{formatNum(snapshot.totalElements)}</dd>

                <dt className="text-muted-foreground">Scripts / sheets</dt>
                <dd className="text-foreground">
                  {formatNum(snapshot.scriptsCount)} / {formatNum(snapshot.stylesheetsCount)}
                </dd>
              </dl>

              {snapshot.topLevelChildren && snapshot.topLevelChildren.length > 0 ? (
                <div className="rounded-md bg-surface-50 px-2 py-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Body top-level children
                  </div>
                  <ul className="space-y-0.5 font-mono text-[10px]">
                    {snapshot.topLevelChildren.map((c, i) => (
                      <li key={i} className="truncate text-foreground" title={c.classes}>
                        <span className="text-muted-foreground">{c.tag}</span>
                        {c.classes ? (
                          <span className="text-foreground"> .{c.classes.split(/\s+/).slice(0, 3).join(".")}</span>
                        ) : null}
                        <span className="ml-1 text-muted-foreground">({c.childCount})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {snapshot.shimStats ? (
                <div className="rounded-md bg-surface-50 px-2 py-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Shim stats
                  </div>
                  <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 font-mono text-[10px]">
                    <dt className="text-muted-foreground">observers</dt>
                    <dd className="text-foreground">{snapshot.shimStats.observerCount}</dd>
                    <dt className="text-muted-foreground">observe() calls</dt>
                    <dd className="text-foreground">{snapshot.shimStats.observeCalls}</dd>
                    <dt className="text-muted-foreground">callbacks fired</dt>
                    <dd
                      className={
                        snapshot.shimStats.fireCalls > 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    >
                      {snapshot.shimStats.fireCalls}
                    </dd>
                    <dt className="text-muted-foreground">last fire</dt>
                    <dd className="text-foreground">
                      {snapshot.shimStats.lastFireAt
                        ? `${Math.round(
                            (snapshot.capturedAt - snapshot.shimStats.lastFireAt) / 1000
                          )}s ago`
                        : "never"}
                    </dd>
                    <dt className="text-muted-foreground">forced fires</dt>
                    <dd className="text-foreground">{snapshot.shimStats.forcedFireCalls}</dd>
                    <dt className="text-muted-foreground">postMessage hits</dt>
                    <dd className="text-foreground">{snapshot.shimStats.listenerHits}</dd>
                  </dl>
                  {forceFireResult ? (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Last force-fire: {forceFireResult}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-md bg-surface-50 px-2 py-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Shims & libraries
                </div>
                <div className="flex flex-wrap gap-1">
                  <StatusPill ok={!!snapshot.shimInstalled} label="canvas IO shim" />
                  <span className="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] text-foreground">
                    IO: {snapshot.ioConstructor}
                  </span>
                  {snapshot.prefersReducedMotion ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                      reduced-motion
                    </span>
                  ) : null}
                  {snapshot.hasGsap ? (
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700">
                      gsap
                    </span>
                  ) : null}
                  {snapshot.hasScrollTrigger ? (
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700">
                      ScrollTrigger
                    </span>
                  ) : null}
                  {snapshot.hasFramerMotion ? (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                      framer-motion
                    </span>
                  ) : null}
                  {snapshot.hasLottie ? (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                      lottie
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md bg-surface-50 px-2 py-2">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Active animations
                  </div>
                  <span className="text-[10px] text-foreground">{snapshot.animationsTotal ?? 0}</span>
                </div>
                {snapshot.animations && snapshot.animations.length > 0 ? (
                  <ul className="space-y-0.5 font-mono text-[10px]">
                    {snapshot.animations.map((a, i) => (
                      <li key={i} className="truncate text-foreground" title={a.target}>
                        <span
                          className={`mr-1 ${
                            a.state === "running" ? "text-emerald-600" : "text-muted-foreground"
                          }`}
                        >
                          {a.state}
                        </span>
                        <span className="text-foreground">{a.name}</span>
                        {a.target ? (
                          <span className="ml-1 text-muted-foreground">→ {a.target}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] italic text-muted-foreground">None running.</p>
                )}
              </div>

              <div className="rounded-md bg-surface-50 px-2 py-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Animation-class elements
                </div>
                <ul className="space-y-1">
                  {(snapshot.elementGroups ?? []).map((g) => (
                    <li key={g.selector} className="text-[11px] text-foreground">
                      <div className="flex items-center justify-between">
                        <code className="text-[10px] text-muted-foreground">{g.selector}</code>
                        <span className="text-[10px] text-foreground">{g.count}</span>
                      </div>
                      {g.sample ? (
                        <div className="mt-0.5 grid grid-cols-[auto,1fr] gap-x-2 text-[10px]">
                          <span className="text-muted-foreground">opacity</span>
                          <span
                            className={`font-mono ${
                              g.sample.opacity === "0" ? "text-red-600" : "text-foreground"
                            }`}
                          >
                            {g.sample.opacity}
                          </span>
                          <span className="text-muted-foreground">animation</span>
                          <span className="font-mono text-foreground">
                            {g.sample.animationName === "none"
                              ? "—"
                              : g.sample.animationName}
                          </span>
                          <span className="text-muted-foreground">y/h</span>
                          <span className="font-mono text-foreground">
                            {g.sample.rectTop} / {g.sample.rectHeight}
                          </span>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <details className="rounded-md bg-surface-50 px-2 py-1">
                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Raw JSON
                </summary>
                <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[10px] text-foreground">
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              </details>

              <p className="text-[10px] text-muted-foreground">
                Captured {new Date(snapshot.capturedAt).toLocaleTimeString()} ·{" "}
                {url ? <span title={url}>via proxy</span> : null}
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
