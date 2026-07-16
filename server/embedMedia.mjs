import { execFile } from "node:child_process"
import { existsSync, promises as fs } from "node:fs"
import { isIP } from "node:net"
import path from "node:path"

// FOX2-75 slice 8: the embed/media capture machinery, moved verbatim from
// vite.config.ts — frame policy + preflight headers, snapshot candidates,
// Hyperbeam live sessions, the media store + proxy, remote asset import,
// playwright capture (embed snapshots + agent-native workspace screenshots),
// and local-app discovery. Untyped .mjs per the agentSearch.mjs precedent;
// server/embedMedia.d.ts declares the typed surface. Config carries the env
// consts (same names) plus the screenshot utils and the two agentSearch
// helpers, so function bodies are unchanged.

export function createEmbedMedia(config = {}) {
  const {
    EMBED_SNAPSHOT_TEMPLATE,
    EMBED_LIVE_TEMPLATE,
    EMBED_CAPTURE_TIMEOUT_MS,
    EMBED_CAPTURE_PRESETS,
    HYPERBEAM_API_KEY,
    HYPERBEAM_API_BASE,
    MEDIA_STORE_DIR,
    MEDIA_MAX_UPLOAD_BYTES,
    LOCAL_APP_DISCOVERY_TIMEOUT_MS,
    LOCAL_APPS_CACHE_MS,
    LOCAL_APP_FALLBACK_PORTS,
    buildAgentNativeWorkspaceScreenshotConfig,
    cropAgentNativeWorkspaceScreenshotPng,
    normalizeAgentNativeWorkspaceScreenshotCropRect,
    resolveAgentNativeBrowserExecutable,
    inferMediaKindFromMimeType,
    filenameFromRemoteUrl,
  } = config

  let cachedPlaywrightChromiumPromise = null
  let cachedLocalApps = {
    expiresAt: 0,
    data: null,
  }

  function normalizeOrigin(value) {
    try {
      return new URL(value).origin
    } catch {
      return null
    }
  }

  function parseFrameAncestorsDirective(cspHeader) {
    if (!cspHeader || typeof cspHeader !== 'string') return null
    const directives = cspHeader
      .split(';')
      .map((directive) => directive.trim())
      .filter(Boolean)
    const directive = directives.find((entry) => entry.toLowerCase().startsWith('frame-ancestors'))
    if (!directive) return null
    return directive.replace(/^frame-ancestors/i, '').trim()
  }

  function matchesSourceExpression(source, appOrigin, targetOrigin) {
    const token = source.trim()
    if (!token) return false
    if (token === "'none'") return false
    if (token === '*') return true
    if (token === "'self'") return appOrigin === targetOrigin

    if (token.endsWith(':') && !token.includes('/')) {
      try {
        return new URL(appOrigin).protocol === token
      } catch {
        return false
      }
    }

    try {
      const app = new URL(appOrigin)
      const appHost = app.hostname.toLowerCase()
      const appPort = app.port || (app.protocol === 'https:' ? '443' : '80')

      const wildcard = token.match(/^(\*|\*\.)?([^/:]+)(?::(\d+))?$/)
      if (wildcard) {
        const [, wildcardPrefix, hostPart, portPart] = wildcard
        const host = hostPart.toLowerCase()
        const hostMatches = wildcardPrefix
          ? appHost === host || appHost.endsWith(`.${host}`)
          : appHost === host
        if (!hostMatches) return false
        if (portPart && appPort !== portPart) return false
        return true
      }

      const absolute = token.includes('://') ? token : `https://${token}`
      const allowed = new URL(absolute)
      const allowedPort = allowed.port || (allowed.protocol === 'https:' ? '443' : '80')
      if (allowed.protocol && allowed.protocol !== app.protocol) return false
      if (allowed.hostname.toLowerCase() !== appHost) return false
      if (allowedPort !== appPort) return false
      return true
    } catch {
      return false
    }
  }

  function evaluateFramePolicy({ xFrameOptions, frameAncestors, targetOrigin, appOrigin }) {
    if (xFrameOptions) {
      const normalized = xFrameOptions.toLowerCase()
      if (normalized.includes('deny')) {
        return {
          embeddable: false,
          blockedBy: 'x-frame-options',
          reason: `Blocked by X-Frame-Options (${xFrameOptions}).`,
        }
      }
      if (normalized.includes('sameorigin') && appOrigin !== targetOrigin) {
        return {
          embeddable: false,
          blockedBy: 'x-frame-options',
          reason: `Blocked by X-Frame-Options SAMEORIGIN (target origin ${targetOrigin}).`,
        }
      }
      const allowFromMatch = normalized.match(/allow-from\s+(.+)/)
      if (allowFromMatch?.[1]) {
        const allowedOrigin = normalizeOrigin(allowFromMatch[1])
        if (!allowedOrigin || allowedOrigin !== appOrigin) {
          return {
            embeddable: false,
            blockedBy: 'x-frame-options',
            reason: `Blocked by X-Frame-Options ALLOW-FROM (${allowFromMatch[1].trim()}).`,
          }
        }
      }
    }

    if (frameAncestors) {
      if (frameAncestors === "'none'") {
        return {
          embeddable: false,
          blockedBy: 'csp-frame-ancestors',
          reason: "Blocked by CSP frame-ancestors 'none'.",
        }
      }

      const sources = frameAncestors.split(/\s+/).filter(Boolean)
      const allowed = sources.some((source) => matchesSourceExpression(source, appOrigin, targetOrigin))
      if (!allowed) {
        return {
          embeddable: false,
          blockedBy: 'csp-frame-ancestors',
          reason: `Blocked by CSP frame-ancestors (${frameAncestors}).`,
        }
      }
    }

    return {
      embeddable: true,
      blockedBy: null,
      reason: 'No blocking iframe policy detected.',
    }
  }

  async function fetchEmbedHeaders(url) {
    const methods = ['GET', 'HEAD']
    let lastError = null

    for (const method of methods) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      const headers = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      }

      try {
        const response = await fetch(url, {
          method,
          redirect: 'follow',
          signal: controller.signal,
          headers: method === 'GET' ? { ...headers, Range: 'bytes=0-0' } : headers,
        })
        clearTimeout(timeout)

        if (method === 'HEAD' && (response.status === 405 || response.status === 501)) {
          continue
        }

        if (method === 'GET' && response.body && typeof response.body.cancel === 'function') {
          response.body.cancel().catch(() => {})
        }

        return response
      } catch (error) {
        clearTimeout(timeout)
        lastError = error
      }
    }

    throw lastError || new Error('Failed to fetch target URL headers.')
  }

  function applyEmbedTemplate(template, context) {
    return template
      .replaceAll('{url}', context.url)
      .replaceAll('{urlEncoded}', encodeURIComponent(context.url))
      .replaceAll('{width}', String(context.width))
      .replaceAll('{height}', String(context.height))
      .replaceAll('{cacheBust}', String(context.cacheBust))
  }

  function buildEmbedSnapshotCandidates(url, width, height, force) {
    const safeWidth = Math.max(200, Number(width) || 1280)
    const safeHeight = Math.max(120, Number(height) || 720)
    const cacheBust = force ? Date.now() : 0
    const context = {
      url,
      width: safeWidth,
      height: safeHeight,
      cacheBust,
    }

    if (EMBED_SNAPSHOT_TEMPLATE) {
      return [
        {
          provider: 'custom-template',
          imageUrl: applyEmbedTemplate(EMBED_SNAPSHOT_TEMPLATE, context),
        },
      ]
    }

    const mshotsQuery = new URLSearchParams({
      w: String(safeWidth),
    })
    if (safeHeight > 0) {
      mshotsQuery.set('h', String(safeHeight))
    }
    if (cacheBust > 0) {
      mshotsQuery.set('cb', String(cacheBust))
    }

    const thumioPrefix = `https://image.thum.io/get/width/${safeWidth}`
    const thumioUrl = `${thumioPrefix}/crop/${safeHeight}/noanimate/${encodeURIComponent(url)}`

    return [
      {
        provider: 'mshots',
        imageUrl: `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?${mshotsQuery.toString()}`,
      },
      {
        provider: 'thumio',
        imageUrl: cacheBust > 0 ? `${thumioUrl}?cb=${cacheBust}` : thumioUrl,
      },
    ]
  }

  async function validateSnapshotCandidate(candidateUrl) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const response = await fetch(candidateUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Range: 'bytes=0-1024',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        },
      })
      if (response.body && typeof response.body.cancel === 'function') {
        response.body.cancel().catch(() => {})
      }
      if (!response.ok) return false
      const contentType = (response.headers.get('content-type') || '').toLowerCase()
      return contentType.includes('image/')
    } catch {
      return false
    } finally {
      clearTimeout(timeout)
    }
  }

  async function buildEmbedSnapshotUrl(url, width, height, force) {
    const candidates = buildEmbedSnapshotCandidates(url, width, height, force)

    for (const candidate of candidates) {
      const isValid = await validateSnapshotCandidate(candidate.imageUrl)
      if (isValid) {
        return candidate
      }
    }

    return candidates[0]
  }

  async function createHyperbeamSession(url) {
    if (!HYPERBEAM_API_KEY) return null
    const response = await fetch(`${HYPERBEAM_API_BASE}/vm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HYPERBEAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_url: url,
        kiosk: true,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `Hyperbeam session failed (${response.status}).`)
    }

    const sessionUrl =
      payload?.embed_url ||
      payload?.session_url ||
      payload?.url ||
      null
    const sessionId =
      payload?.id ||
      payload?.session_id ||
      null

    if (!sessionUrl) {
      throw new Error('Hyperbeam response did not include session URL.')
    }

    return {
      sessionUrl,
      sessionId,
      provider: 'hyperbeam',
      expiresAt: payload?.expires_at || null,
    }
  }

  async function createEmbedLiveSession(url) {
    if (EMBED_LIVE_TEMPLATE) {
      return {
        sessionUrl: EMBED_LIVE_TEMPLATE
          .replaceAll('{url}', url)
          .replaceAll('{urlEncoded}', encodeURIComponent(url)),
        sessionId: null,
        provider: 'template',
        expiresAt: null,
      }
    }

    const hyperbeam = await createHyperbeamSession(url)
    if (hyperbeam) return hyperbeam
    return null
  }

  async function deleteEmbedLiveSession(sessionId) {
    if (!sessionId) return
    if (!HYPERBEAM_API_KEY) return
    try {
      await fetch(`${HYPERBEAM_API_BASE}/vm/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${HYPERBEAM_API_KEY}`,
        },
      })
    } catch {
      // Best-effort cleanup.
    }
  }

  function parseDataUrlPayload(dataUrl) {
    if (typeof dataUrl !== 'string') return null
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mime = match[1]?.toLowerCase()
    const base64 = match[2]?.replace(/\s/g, '')
    if (!mime || !base64) return null
    try {
      return {
        mime,
        buffer: Buffer.from(base64, 'base64'),
      }
    } catch {
      return null
    }
  }

  function mimeTypeForExtension(ext) {
    switch ((ext || '').toLowerCase()) {
      case '.png':
        return 'image/png'
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg'
      case '.gif':
        return 'image/gif'
      case '.webp':
        return 'image/webp'
      case '.svg':
        return 'image/svg+xml'
      case '.mp4':
        return 'video/mp4'
      case '.webm':
        return 'video/webm'
      case '.mov':
        return 'video/quicktime'
      case '.m4v':
        return 'video/x-m4v'
      case '.ogg':
        return 'video/ogg'
      default:
        return 'application/octet-stream'
    }
  }

  function extensionForMime(mime) {
    switch ((mime || '').toLowerCase()) {
      case 'image/png':
        return '.png'
      case 'image/jpeg':
        return '.jpg'
      case 'image/gif':
        return '.gif'
      case 'image/webp':
        return '.webp'
      case 'image/svg+xml':
        return '.svg'
      case 'video/mp4':
        return '.mp4'
      case 'video/webm':
        return '.webm'
      case 'video/quicktime':
        return '.mov'
      case 'video/x-m4v':
        return '.m4v'
      case 'video/ogg':
        return '.ogg'
      default:
        return '.bin'
    }
  }

  async function ensureMediaStoreDir() {
    await fs.mkdir(MEDIA_STORE_DIR, { recursive: true })
  }

  async function storeMediaBuffer(buffer, mimeType, filename) {
    if (!Buffer.isBuffer(buffer) || buffer.length <= 0) {
      throw new Error('Media payload is empty.')
    }
    if (buffer.length > MEDIA_MAX_UPLOAD_BYTES) {
      throw new Error(`Media file is too large. Max ${Math.round(MEDIA_MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`)
    }

    await ensureMediaStoreDir()
    const originalExt = path.extname(typeof filename === 'string' ? filename : '').toLowerCase()
    const fallbackExt = extensionForMime(mimeType)
    const safeExt = originalExt || fallbackExt
    const safeName = `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safeExt}`
    const filePath = path.join(MEDIA_STORE_DIR, safeName)

    await fs.writeFile(filePath, buffer)
    return {
      fileName: safeName,
      mimeType: originalExt ? mimeTypeForExtension(originalExt) : mimeType,
      sizeBytes: buffer.length,
      mediaUrl: `/api/media/file/${encodeURIComponent(safeName)}`,
      storedAt: new Date().toISOString(),
    }
  }

  async function storeMediaDataUrl(dataUrl, filename) {
    const parsed = parseDataUrlPayload(dataUrl)
    if (!parsed) {
      throw new Error('Invalid media payload. Expected data URL.')
    }
    return storeMediaBuffer(parsed.buffer, parsed.mime, filename)
  }

  async function readStoredMedia(fileName) {
    if (!fileName || typeof fileName !== 'string') return null
    const trimmed = fileName.trim()
    if (!trimmed) return null
    await ensureMediaStoreDir()
    const filePath = path.resolve(MEDIA_STORE_DIR, trimmed)
    if (!filePath.startsWith(MEDIA_STORE_DIR + path.sep)) {
      return null
    }
    if (!existsSync(filePath)) return null
    const content = await fs.readFile(filePath)
    return {
      content,
      mimeType: mimeTypeForExtension(path.extname(trimmed)),
    }
  }

  function isBlockedMediaHost(hostname) {
    const lower = (hostname || '').toLowerCase()
    if (!lower) return true
    if (lower === 'localhost' || lower === '0.0.0.0' || lower === '::1') return true
    if (lower.endsWith('.local')) return true
    if (/^127\./.test(lower)) return true
    if (/^10\./.test(lower)) return true
    if (/^192\.168\./.test(lower)) return true
    if (/^169\.254\./.test(lower)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true
    if (isIP(lower) === 6 && (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd'))) return true
    return false
  }

  function parseProxyMediaUrl(raw) {
    if (!raw || typeof raw !== 'string') return null
    try {
      const parsed = new URL(raw)
      if (!['http:', 'https:'].includes(parsed.protocol)) return null
      if (isBlockedMediaHost(parsed.hostname)) return null
      return parsed
    } catch {
      return null
    }
  }

  async function fetchProxyMedia(url, rangeHeader) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const headers = {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      }
      if (rangeHeader) {
        headers.Range = rangeHeader
      }
      return await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  // FOX2-75 slice 7: the web/route/asset search providers live in
  // server/agentSearch.mjs. Keys are passed as config because env files load

  async function importAssetFromRemoteUrl(assetUrl, preferredFilename) {
    const parsedUrl = parseProxyMediaUrl(assetUrl)
    if (!parsedUrl) {
      throw new Error('Invalid or blocked asset URL.')
    }

    const upstream = await fetchProxyMedia(parsedUrl.toString())
    if (!upstream.ok) {
      throw new Error(`Upstream asset request failed (${upstream.status}).`)
    }

    const contentType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!contentType) {
      throw new Error('Asset response did not include content-type.')
    }
    if (contentType.startsWith('text/') && contentType !== 'image/svg+xml') {
      throw new Error(`Asset URL returned non-media content-type (${contentType}).`)
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    const fallbackExt = extensionForMime(contentType)
    const filename = preferredFilename || filenameFromRemoteUrl(assetUrl, fallbackExt)
    const stored = await storeMediaBuffer(buffer, contentType, filename)
    return {
      ...stored,
      mediaKind: inferMediaKindFromMimeType(contentType, assetUrl),
    }
  }

  // FOX2-75 slice 7: the /api/agent/* search endpoints are handled by

  function normalizeCaptureProvider(raw) {
    if (raw === 'playwright' || raw === 'fetch' || raw === 'auto') {
      return raw
    }
    return 'auto'
  }

  function normalizeCaptureTargets(rawTargets) {
    if (!rawTargets) return ['desktop']

    if (typeof rawTargets === 'string') {
      const value = rawTargets.trim().toLowerCase()
      if (value === 'both') return ['desktop', 'mobile']
      if (value === 'mobile') return ['mobile']
      if (value === 'desktop') return ['desktop']
      return ['desktop']
    }

    if (Array.isArray(rawTargets)) {
      const unique = Array.from(
        new Set(
          rawTargets
            .map((target) => String(target).trim().toLowerCase())
            .filter((target) => target === 'desktop' || target === 'mobile')
        )
      )
      if (unique.length > 0) return unique
    }

    return ['desktop']
  }

  function buildCaptureFilename(url, target, mimeType) {
    let host = 'capture'
    try {
      host = new URL(url).hostname.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').slice(0, 48) || 'capture'
    } catch {
      host = 'capture'
    }
    return `${host}-${target}${extensionForMime(mimeType)}`
  }

  async function resolvePlaywrightChromium() {
    if (cachedPlaywrightChromiumPromise) {
      return cachedPlaywrightChromiumPromise
    }

    cachedPlaywrightChromiumPromise = (async () => {
      const moduleNames = ['playwright', 'playwright-core']
      for (const moduleName of moduleNames) {
        try {
          const mod = await import(moduleName)
          const chromium = mod?.chromium || mod?.default?.chromium || null
          if (chromium) return chromium
        } catch {
          // Try the next module.
        }
      }
      return null
    })()

    return cachedPlaywrightChromiumPromise
  }

  const AGENT_NATIVE_SCREENSHOT_DEVICE_SCALE_FACTOR = 2

  async function measureCanvasItemScreenshotCropRect(page, itemIds, padding = 24) {
    const normalizedIds = Array.isArray(itemIds)
      ? itemIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim())
      : []
    if (normalizedIds.length === 0) return null

    await page
      .waitForFunction(
        (expectedIds) => {
          const idSet = new Set(expectedIds)
          const nodes = Array.from(document.querySelectorAll('[data-canvas-item-id]'))
          return expectedIds.every((id) =>
            nodes.some((node) => idSet.has(node.getAttribute('data-canvas-item-id') || ''))
          )
        },
        normalizedIds,
        { timeout: 3000 }
      )
      .catch(() => {})

    const rawRect = await page.evaluate(
      ({ itemIds: expectedIds, padding: requestedPadding }) => {
        const idSet = new Set(
          Array.isArray(expectedIds)
            ? expectedIds.filter((id) => typeof id === 'string' && id.trim())
            : []
        )
        if (idSet.size === 0) return null

        const nodes = Array.from(document.querySelectorAll('[data-canvas-item-id]')).filter((node) =>
          idSet.has(node.getAttribute('data-canvas-item-id') || '')
        )

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const node of nodes) {
          const rect = node.getBoundingClientRect()
          if (rect.width <= 0 || rect.height <= 0) continue
          minX = Math.min(minX, rect.left)
          minY = Math.min(minY, rect.top)
          maxX = Math.max(maxX, rect.right)
          maxY = Math.max(maxY, rect.bottom)
        }

        if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

        const safePadding = Number.isFinite(requestedPadding)
          ? Math.max(0, Number(requestedPadding))
          : 24

        return {
          x: minX - safePadding,
          y: minY - safePadding,
          width: maxX - minX + safePadding * 2,
          height: maxY - minY + safePadding * 2,
        }
      },
      { itemIds: normalizedIds, padding }
    )

    const viewportSize = page.viewportSize() || { width: 0, height: 0 }
    return normalizeAgentNativeWorkspaceScreenshotCropRect(rawRect, viewportSize)
  }

  async function captureSnapshotWithPlaywright(url, target, options = {}) {
    const chromium = await resolvePlaywrightChromium()
    if (!chromium) {
      return {
        status: 'unavailable',
        reason: 'Playwright is not installed on this environment.',
      }
    }

    const presetViewport = EMBED_CAPTURE_PRESETS[target] || EMBED_CAPTURE_PRESETS.desktop
    // Allow callers (canvas artboards, in particular) to override the viewport so
    // the captured layout matches the artboard width. Height is treated as a
    // hint — when fullPage is true Playwright will extend the screenshot to the
    // full scrollable document regardless.
    const viewport =
      options.viewport && Number.isFinite(options.viewport.width)
        ? {
            width: Math.max(200, Math.round(options.viewport.width)),
            height: Math.max(
              120,
              Math.round(options.viewport.height || presetViewport.height)
            ),
          }
        : presetViewport
    const fullPage = options.fullPage === true
    let browser = null

    try {
      const executablePath = resolveAgentNativeBrowserExecutable()
      browser = await chromium.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
      })
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: AGENT_NATIVE_SCREENSHOT_DEVICE_SCALE_FACTOR,
        colorScheme: 'light',
      })
      if (Array.isArray(options.storageEntries) && options.storageEntries.length > 0) {
        await context.addInitScript(
          ({ storageEntries }) => {
            for (const entry of storageEntries) {
              if (!entry || typeof entry !== 'object') continue
              const key =
                typeof entry.key === 'string' && entry.key.trim() ? entry.key.trim() : ''
              const value =
                typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value ?? null)
              if (!key) continue
              window.localStorage.setItem(key, value)
            }
          },
          { storageEntries: options.storageEntries }
        )
      }
      const page = await context.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: EMBED_CAPTURE_TIMEOUT_MS })
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
      if (typeof options.waitForText === 'string' && options.waitForText.trim()) {
        await page
          .waitForFunction(
            (expectedText) => document.body?.innerText?.includes(expectedText),
            options.waitForText,
            { timeout: 8000 }
          )
          .catch(() => {})
      }
      await page.waitForTimeout(Number.isFinite(options.settleMs) ? options.settleMs : 300)
      const cropRect =
        Array.isArray(options.cropItemIds) && options.cropItemIds.length > 0
          ? await measureCanvasItemScreenshotCropRect(page, options.cropItemIds, options.cropPadding)
          : null
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage,
        animations: 'disabled',
      })
      const outputBuffer = cropRect
        ? cropAgentNativeWorkspaceScreenshotPng(
            screenshot,
            cropRect,
            AGENT_NATIVE_SCREENSHOT_DEVICE_SCALE_FACTOR
          )
        : screenshot
      await context.close()
      return {
        status: 'ready',
        buffer: outputBuffer,
        mimeType: 'image/png',
        viewport,
        provider: 'playwright-local',
        cropRect,
      }
    } catch (error) {
      return {
        status: 'error',
        reason: error?.message || 'Playwright capture failed.',
      }
    } finally {
      if (browser) {
        await browser.close().catch(() => {})
      }
    }
  }

  async function fetchSnapshotImageBuffer(imageUrl) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch(imageUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        },
      })
      if (!response.ok) {
        throw new Error(`Snapshot source returned ${response.status}.`)
      }
      const mimeType = (response.headers.get('content-type') || 'image/png').split(';')[0].trim().toLowerCase()
      if (!mimeType.startsWith('image/')) {
        throw new Error(`Snapshot source is not an image (${mimeType}).`)
      }
      const content = Buffer.from(await response.arrayBuffer())
      if (content.length <= 0) {
        throw new Error('Snapshot source returned an empty payload.')
      }
      return {
        buffer: content,
        mimeType,
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  async function captureSnapshotWithFetch(url, target, force = false) {
    const viewport = EMBED_CAPTURE_PRESETS[target] || EMBED_CAPTURE_PRESETS.desktop
    const candidates = buildEmbedSnapshotCandidates(url, viewport.width, viewport.height, force)
    const attemptedReasons = []
    for (const candidate of candidates) {
      try {
        const image = await fetchSnapshotImageBuffer(candidate.imageUrl)
        return {
          status: 'ready',
          buffer: image.buffer,
          mimeType: image.mimeType,
          viewport,
          provider: `snapshot-${candidate.provider}`,
          sourceImageUrl: candidate.imageUrl,
        }
      } catch (error) {
        attemptedReasons.push(error?.message || `Failed provider ${candidate.provider}.`)
      }
    }

    return {
      status: 'error',
      reason: attemptedReasons[attemptedReasons.length - 1] || 'Snapshot fetch fallback failed.',
    }
  }

  async function captureEmbedSnapshotTarget(url, target, provider, force = false, options = {}) {
    const attemptedReasons = []

    if (provider === 'auto' || provider === 'playwright') {
      const playwrightResult = await captureSnapshotWithPlaywright(url, target, {
        fullPage: options.fullPage === true,
        viewport: options.viewport,
      })
      if (playwrightResult.status === 'ready') {
        const stored = await storeMediaBuffer(
          playwrightResult.buffer,
          playwrightResult.mimeType,
          buildCaptureFilename(url, target, playwrightResult.mimeType)
        )
        return {
          target,
          status: 'ready',
          mediaUrl: stored.mediaUrl,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          provider: playwrightResult.provider,
          capturedAt: stored.storedAt,
          viewport: playwrightResult.viewport,
        }
      }
      if (playwrightResult.reason) {
        attemptedReasons.push(playwrightResult.reason)
      }
      if (provider === 'playwright') {
        return {
          target,
          status: 'error',
          reason: attemptedReasons[attemptedReasons.length - 1] || 'Playwright capture failed.',
        }
      }
    }

    if (provider === 'auto' || provider === 'fetch') {
      const fetchResult = await captureSnapshotWithFetch(url, target, force)
      if (fetchResult.status === 'ready') {
        const stored = await storeMediaBuffer(
          fetchResult.buffer,
          fetchResult.mimeType,
          buildCaptureFilename(url, target, fetchResult.mimeType)
        )
        return {
          target,
          status: 'ready',
          mediaUrl: stored.mediaUrl,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          provider: fetchResult.provider,
          capturedAt: stored.storedAt,
          viewport: fetchResult.viewport,
          sourceImageUrl: fetchResult.sourceImageUrl,
        }
      }
      if (fetchResult.reason) {
        attemptedReasons.push(fetchResult.reason)
      }
    }

    return {
      target,
      status: 'error',
      reason: attemptedReasons[attemptedReasons.length - 1] || 'No capture provider could generate a snapshot.',
    }
  }

  async function captureAgentNativeWorkspaceScreenshot(input) {
    const focusItemIds =
      input.workspaceId === 'canvas' && Array.isArray(input.focusItemIds)
        ? input.focusItemIds.filter((id) => typeof id === 'string' && id.trim())
        : []
    const config = buildAgentNativeWorkspaceScreenshotConfig(
      input.workspaceId,
      input.projectId,
      input.snapshot
    )

    if (!config) {
      return {
        status: 'error',
        reason: `Unsupported screenshot workspace: ${input.workspaceId}`,
      }
    }

    const pageUrl = new URL(config.route, input.origin).toString()
    const capture = await captureSnapshotWithPlaywright(pageUrl, input.target, {
      storageEntries: config.storageEntries,
      waitForText: config.waitForText,
      cropItemIds: focusItemIds,
      cropPadding: Number.isFinite(input.cropPadding) ? Number(input.cropPadding) : undefined,
    })

    if (capture.status !== 'ready') {
      return capture
    }

    const stored = await storeMediaBuffer(
      capture.buffer,
      capture.mimeType,
      `agent-${input.workspaceId}-${input.target}.${capture.mimeType === 'image/png' ? 'png' : 'bin'}`
    )

    return {
      status: 'ready',
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      target: input.target,
      mediaUrl: stored.mediaUrl,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      provider: capture.provider,
      capturedAt: stored.storedAt,
      viewport: capture.viewport,
      cropRect: capture.cropRect || null,
      route: config.route,
    }
  }

  function parseListeningPortsFromLsof(output) {
    const ports = new Set()
    if (!output || typeof output !== 'string') return ports
    const lines = output.split(/\r?\n/).slice(1)
    for (const line of lines) {
      if (!line.includes('(LISTEN)')) continue
      const match = line.match(/TCP\s+([^\s]+)\s+\(LISTEN\)/i)
      if (!match?.[1]) continue
      const endpoint = match[1]
      const portMatch = endpoint.match(/:(\d+)$/)
      if (!portMatch?.[1]) continue
      const port = Number(portMatch[1])
      if (!Number.isInteger(port) || port <= 1023 || port > 65535) continue
      ports.add(port)
    }
    return ports
  }

  function listListeningPortsViaLsof() {
    return new Promise((resolve) => {
      execFile(
        'lsof',
        ['-nP', '-iTCP', '-sTCP:LISTEN'],
        {
          timeout: LOCAL_APP_DISCOVERY_TIMEOUT_MS,
          maxBuffer: 1024 * 1024,
        },
        (error, stdout) => {
          if (error || !stdout) {
            resolve([])
            return
          }
          const ports = Array.from(parseListeningPortsFromLsof(stdout)).sort((a, b) => a - b)
          resolve(ports)
        }
      )
    })
  }

  async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept: 'text/html,*/*;q=0.9',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  async function probeLocalAppPort(port, appOrigin) {
    const candidates = [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`]
    for (const candidate of candidates) {
      try {
        const response = await fetchWithTimeout(candidate, LOCAL_APP_DISCOVERY_TIMEOUT_MS)
        const status = response.status
        if (status >= 500) {
          if (response.body && typeof response.body.cancel === 'function') {
            response.body.cancel().catch(() => {})
          }
          continue
        }
        const finalUrl = response.url || candidate
        const targetOrigin = normalizeOrigin(finalUrl) || normalizeOrigin(candidate)
        const xFrameOptions = response.headers.get('x-frame-options')
        const frameAncestors = parseFrameAncestorsDirective(response.headers.get('content-security-policy'))
        const policy = evaluateFramePolicy({
          xFrameOptions,
          frameAncestors,
          targetOrigin: targetOrigin || candidate,
          appOrigin,
        })

        if (response.body && typeof response.body.cancel === 'function') {
          response.body.cancel().catch(() => {})
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase()
        const likelyWebContent =
          !contentType ||
          contentType.includes('text/html') ||
          contentType.includes('application/xhtml+xml')
        if (!likelyWebContent) {
          continue
        }
        const server = response.headers.get('server')
        return {
          port,
          url: candidate,
          finalUrl,
          status,
          live: true,
          contentType: contentType || undefined,
          server: server || undefined,
          embeddable: policy.embeddable,
          blockedBy: policy.blockedBy,
          reason: policy.reason,
        }
      } catch {
        // Try next candidate.
      }
    }
    return null
  }

  async function discoverLocalApps(appOrigin, force) {
    const now = Date.now()
    if (!force && cachedLocalApps.data && cachedLocalApps.expiresAt > now) {
      return cachedLocalApps.data
    }

    const lsofPorts = await listListeningPortsViaLsof()
    const source = lsofPorts.length > 0 ? 'lsof' : 'fallback'
    const targetPorts = (lsofPorts.length > 0 ? lsofPorts : LOCAL_APP_FALLBACK_PORTS).slice(0, 64)
    const probes = await Promise.all(targetPorts.map((port) => probeLocalAppPort(port, appOrigin)))
    const apps = probes.filter(Boolean).sort((a, b) => a.port - b.port)

    const result = {
      source,
      scannedPorts: targetPorts.length,
      apps,
    }
    cachedLocalApps = {
      data: result,
      expiresAt: now + LOCAL_APPS_CACHE_MS,
    }
    return result
  }
  return {
    normalizeOrigin,
    parseFrameAncestorsDirective,
    evaluateFramePolicy,
    fetchEmbedHeaders,
    buildEmbedSnapshotUrl,
    createEmbedLiveSession,
    deleteEmbedLiveSession,
    parseDataUrlPayload,
    mimeTypeForExtension,
    extensionForMime,
    storeMediaBuffer,
    storeMediaDataUrl,
    readStoredMedia,
    parseProxyMediaUrl,
    fetchProxyMedia,
    importAssetFromRemoteUrl,
    normalizeCaptureProvider,
    normalizeCaptureTargets,
    buildCaptureFilename,
    captureEmbedSnapshotTarget,
    captureAgentNativeWorkspaceScreenshot,
    discoverLocalApps,
  }
}
