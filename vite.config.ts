import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'
import { execFile } from 'node:child_process'
import {
  createPaperGalleryEntry,
  formatPaperComponentSource,
  formatPaperGalleryEntrySource,
  importPaperSelection,
  slugify,
  toPascalCase,
} from './core/mcp/paper'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envMode =
  process.env.NODE_ENV ||
  (process.argv.includes('build') ? 'production' : 'development')
const loadedEnv = loadEnv(envMode, __dirname, '')
for (const [key, value] of Object.entries(loadedEnv)) {
  if (typeof process.env[key] === 'undefined') {
    process.env[key] = value
  }
}
const ENV_LOCAL_PATH = path.resolve(__dirname, '.env.local')

const PROJECTS_ROOT = path.resolve(__dirname, 'projects')
const PAPER_MCP_MODULE = process.env.PAPER_MCP_CLIENT_MODULE
const EMBED_SNAPSHOT_TEMPLATE = process.env.EMBED_SNAPSHOT_TEMPLATE
const EMBED_LIVE_TEMPLATE = process.env.EMBED_LIVE_TEMPLATE
const COPILOTKIT_PROVIDER = (
  process.env.COPILOTKIT_PROVIDER ||
  (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'anthropic')
).toLowerCase()
const COPILOTKIT_ANTHROPIC_MODEL =
  process.env.COPILOTKIT_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
const COPILOTKIT_OPENROUTER_MODEL =
  process.env.COPILOTKIT_OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || 'http://localhost:5173'
const OPENROUTER_SITE_NAME = process.env.OPENROUTER_SITE_NAME || 'gallery-poc'
const HYPERBEAM_API_KEY = process.env.HYPERBEAM_API_KEY
const HYPERBEAM_API_BASE = process.env.HYPERBEAM_API_BASE || 'https://engine.hyperbeam.com/v0'
const MEDIA_STORE_DIR = path.resolve(__dirname, '.canvas-media')
const MEDIA_MAX_UPLOAD_BYTES = Number(process.env.MEDIA_MAX_UPLOAD_BYTES || 20 * 1024 * 1024)
const EMBED_CAPTURE_TIMEOUT_MS = Number(process.env.EMBED_CAPTURE_TIMEOUT_MS || 20000)
const LOCAL_APP_DISCOVERY_TIMEOUT_MS = Number(process.env.LOCAL_APP_DISCOVERY_TIMEOUT_MS || 1200)
const LOCAL_APPS_CACHE_MS = Number(process.env.LOCAL_APPS_CACHE_MS || 4000)
const EMBED_CAPTURE_PRESETS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
}
const LOCAL_APP_FALLBACK_PORTS = [3000, 3001, 3002, 4173, 4200, 4321, 5000, 5173, 5174, 5175, 8000, 8080, 8081, 9000]
const HAS_COPILOTKIT_REACT_CORE = existsSync(
  path.resolve(__dirname, 'node_modules/@copilotkit/react-core/package.json')
)
const HAS_COPILOTKIT_REACT_UI = existsSync(
  path.resolve(__dirname, 'node_modules/@copilotkit/react-ui/package.json')
)
let cachedPaperClient = null
let attemptedPaperClientLoad = false
let cachedPlaywrightChromiumPromise = null
let cachedLocalApps = {
  expiresAt: 0,
  data: null,
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const body = Buffer.concat(chunks).toString('utf8')
  if (!body) return {}
  return JSON.parse(body)
}

function uniqueName(baseName, componentDir, configDir) {
  const baseSlug = slugify(baseName)
  const baseComponent = toPascalCase(baseName)
  let slug = baseSlug
  let componentName = baseComponent
  let suffix = 1

  const hasConflict = () => {
    const componentPath = path.join(componentDir, `${componentName}.tsx`)
    const configPath = path.join(configDir, `${slug}.gallery.ts`)
    return existsSync(componentPath) || existsSync(configPath)
  }

  while (hasConflict()) {
    suffix += 1
    slug = `${baseSlug}-${suffix}`
    componentName = `${baseComponent}${suffix}`
  }

  return { slug, componentName }
}

async function ensureProjectScaffold(projectId, label) {
  const projectDir = path.join(PROJECTS_ROOT, projectId)
  await fs.mkdir(path.join(projectDir, 'components', 'paper'), { recursive: true })
  await fs.mkdir(path.join(projectDir, 'configs', 'paper'), { recursive: true })

  const metaPath = path.join(projectDir, 'project.json')
  if (!existsSync(metaPath)) {
    const meta = {
      label: label || projectId,
    }
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))
  }

  const registryPath = path.join(projectDir, 'registry.json')
  if (!existsSync(registryPath)) {
    await fs.writeFile(registryPath, JSON.stringify({ ui: [], page: [] }, null, 2))
  }

  return projectDir
}

async function listProjects() {
  if (!existsSync(PROJECTS_ROOT)) return []
  const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true })

  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const projectId = entry.name
        const metaPath = path.join(PROJECTS_ROOT, projectId, 'project.json')
        let label = projectId

        if (existsSync(metaPath)) {
          try {
            const raw = await fs.readFile(metaPath, 'utf8')
            const parsed = JSON.parse(raw)
            if (typeof parsed?.label === 'string' && parsed.label.trim()) {
              label = parsed.label.trim()
            }
          } catch {
            // ignore malformed project metadata
          }
        }

        return { id: projectId, label }
      })
  )

  return projects.sort((a, b) => a.label.localeCompare(b.label))
}

async function resolvePaperMcpClient() {
  if (cachedPaperClient) return cachedPaperClient
  if (attemptedPaperClientLoad) return null
  attemptedPaperClientLoad = true

  const globalClient = globalThis?.paperMcp || globalThis?.mcp?.paper
  if (globalClient) {
    cachedPaperClient = globalClient
    return cachedPaperClient
  }

  if (!PAPER_MCP_MODULE) return null

  try {
    const resolved = path.isAbsolute(PAPER_MCP_MODULE)
      ? PAPER_MCP_MODULE
      : path.resolve(__dirname, PAPER_MCP_MODULE)
    const mod = await import(pathToFileURL(resolved).href)
    cachedPaperClient =
      mod?.default ||
      mod?.paperMcp ||
      mod?.client ||
      mod?.mcp?.paper ||
      null
    return cachedPaperClient
  } catch (error) {
    console.warn('[paper import] Failed to load PAPER_MCP_CLIENT_MODULE:', error)
    return null
  }
}

async function updateProjectRegistry(projectDir, entryId, kind) {
  const registryPath = path.join(projectDir, 'registry.json')
  const fallback = { ui: [], page: [] }
  let registry = fallback

  if (existsSync(registryPath)) {
    try {
      const raw = await fs.readFile(registryPath, 'utf8')
      registry = JSON.parse(raw)
    } catch {
      registry = fallback
    }
  }

  const normalized = {
    ui: Array.isArray(registry.ui) ? registry.ui : [],
    page: Array.isArray(registry.page) ? registry.page : [],
  }

  const bucket = kind === 'page' ? 'page' : 'ui'
  const other = bucket === 'page' ? 'ui' : 'page'
  if (!normalized[bucket].includes(entryId)) {
    normalized[bucket].push(entryId)
  }
  normalized[other] = normalized[other].filter((id) => id !== entryId)

  await fs.writeFile(registryPath, JSON.stringify(normalized, null, 2))
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

async function captureSnapshotWithPlaywright(url, target) {
  const chromium = await resolvePlaywrightChromium()
  if (!chromium) {
    return {
      status: 'unavailable',
      reason: 'Playwright is not installed on this environment.',
    }
  }

  const viewport = EMBED_CAPTURE_PRESETS[target] || EMBED_CAPTURE_PRESETS.desktop
  let browser = null

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      colorScheme: 'light',
    })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: EMBED_CAPTURE_TIMEOUT_MS })
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      animations: 'disabled',
    })
    await context.close()
    return {
      status: 'ready',
      buffer: screenshot,
      mimeType: 'image/png',
      viewport,
      provider: 'playwright-local',
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

async function captureEmbedSnapshotTarget(url, target, provider, force = false) {
  const attemptedReasons = []

  if (provider === 'auto' || provider === 'playwright') {
    const playwrightResult = await captureSnapshotWithPlaywright(url, target)
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

function paperImportPlugin() {
  return {
    name: 'paper-import',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()
        const pathname = req.url.split('?')[0]

        if (req.method === 'GET' && pathname === '/api/projects/list') {
          try {
            const projects = await listProjects()
            return sendJson(res, 200, { ok: true, projects })
          } catch (error) {
            return sendJson(res, 500, { error: error?.message || 'Failed to list projects.' })
          }
        }

        if (req.method === 'GET' && pathname === '/api/embed/preflight') {
          try {
            const requestUrl = new URL(req.url, 'http://localhost')
            const targetUrlRaw = requestUrl.searchParams.get('url')
            const appOriginRaw = requestUrl.searchParams.get('appOrigin')

            if (!targetUrlRaw) {
              return sendJson(res, 400, { error: 'url query param is required.' })
            }

            const targetUrl = new URL(targetUrlRaw)
            const appOrigin = normalizeOrigin(appOriginRaw || '')
            if (!appOrigin) {
              return sendJson(res, 400, { error: 'appOrigin query param is required.' })
            }

            const response = await fetchEmbedHeaders(targetUrl.toString())
            const finalUrl = response.url || targetUrl.toString()
            const targetOrigin = normalizeOrigin(finalUrl) || targetUrl.origin
            const xFrameOptions = response.headers.get('x-frame-options')
            const frameAncestors = parseFrameAncestorsDirective(response.headers.get('content-security-policy'))
            const policy = evaluateFramePolicy({
              xFrameOptions,
              frameAncestors,
              targetOrigin,
              appOrigin,
            })

            return sendJson(res, 200, {
              ok: true,
              url: targetUrl.toString(),
              finalUrl,
              targetOrigin,
              embeddable: policy.embeddable,
              blockedBy: policy.blockedBy,
              reason: policy.reason,
              checkedAt: new Date().toISOString(),
              headers: {
                xFrameOptions,
                frameAncestors,
              },
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to preflight iframe policy.' })
          }
        }

        if (req.method === 'GET' && pathname === '/api/embed/local-apps') {
          try {
            const requestUrl = new URL(req.url, 'http://localhost')
            const appOriginRaw = requestUrl.searchParams.get('appOrigin') || 'http://localhost:5173'
            const appOrigin = normalizeOrigin(appOriginRaw)
            if (!appOrigin) {
              return sendJson(res, 400, { error: 'appOrigin query param is invalid.' })
            }
            const force = requestUrl.searchParams.get('force') === '1'
            const discovered = await discoverLocalApps(appOrigin, force)
            return sendJson(res, 200, {
              ok: true,
              source: discovered.source,
              scannedPorts: discovered.scannedPorts,
              apps: discovered.apps,
              checkedAt: new Date().toISOString(),
            })
          } catch (error) {
            return sendJson(res, 500, { error: error?.message || 'Failed to discover localhost apps.' })
          }
        }

        if (req.method === 'GET' && pathname === '/api/media/proxy') {
          try {
            const requestUrl = new URL(req.url, 'http://localhost')
            const targetRaw = requestUrl.searchParams.get('url')
            const target = parseProxyMediaUrl(targetRaw)
            if (!target) {
              return sendJson(res, 400, { error: 'Invalid or blocked media URL.' })
            }

            const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined
            const upstream = await fetchProxyMedia(target.toString(), rangeHeader)

            if (!upstream.ok && upstream.status !== 206) {
              return sendJson(res, upstream.status || 502, {
                error: `Upstream media request failed (${upstream.status}).`,
              })
            }

            res.statusCode = upstream.status
            const contentType = upstream.headers.get('content-type') || mimeTypeForExtension(path.extname(target.pathname))
            res.setHeader('Content-Type', contentType)
            const passthroughHeaders = ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']
            for (const headerName of passthroughHeaders) {
              const headerValue = upstream.headers.get(headerName)
              if (headerValue) {
                res.setHeader(headerName, headerValue)
              }
            }
            res.setHeader('Cache-Control', 'public, max-age=300')

            if (!upstream.body) {
              res.end()
              return
            }

            Readable.fromWeb(upstream.body).pipe(res)
            return
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to proxy media.' })
          }
        }

        if (req.method === 'POST' && pathname === '/api/media/store') {
          try {
            const body = await readJson(req)
            const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : ''
            const filename = typeof body.filename === 'string' ? body.filename : undefined
            if (!dataUrl) {
              return sendJson(res, 400, { error: 'dataUrl is required.' })
            }
            const stored = await storeMediaDataUrl(dataUrl, filename)
            return sendJson(res, 200, {
              ok: true,
              mediaUrl: stored.mediaUrl,
              fileName: stored.fileName,
              mimeType: stored.mimeType,
              sizeBytes: stored.sizeBytes,
              provider: 'local-media-store',
              storedAt: stored.storedAt,
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to store media file.' })
          }
        }

        if (req.method === 'GET' && pathname.startsWith('/api/media/file/')) {
          try {
            const fileName = decodeURIComponent(pathname.replace('/api/media/file/', '').trim())
            const stored = await readStoredMedia(fileName)
            if (!stored) {
              return sendJson(res, 404, { error: 'Media file not found.' })
            }
            res.statusCode = 200
            res.setHeader('Content-Type', stored.mimeType)
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            res.end(stored.content)
            return
          } catch (error) {
            return sendJson(res, 500, { error: error?.message || 'Failed to load media file.' })
          }
        }

        if (req.method === 'GET' && pathname === '/api/embed/snapshot') {
          try {
            const requestUrl = new URL(req.url, 'http://localhost')
            const targetUrlRaw = requestUrl.searchParams.get('url')
            const widthRaw = requestUrl.searchParams.get('width')
            const heightRaw = requestUrl.searchParams.get('height')
            const force = requestUrl.searchParams.get('force') === '1'

            if (!targetUrlRaw) {
              return sendJson(res, 400, { error: 'url query param is required.' })
            }

            const targetUrl = new URL(targetUrlRaw)
            const snapshot = await buildEmbedSnapshotUrl(targetUrl.toString(), widthRaw, heightRaw, force)
            return sendJson(res, 200, {
              ok: true,
              url: targetUrl.toString(),
              imageUrl: snapshot.imageUrl,
              provider: snapshot.provider,
              reason: snapshot.provider === 'mshots'
                ? 'Fallback snapshot provider. Configure EMBED_SNAPSHOT_TEMPLATE for custom service.'
                : undefined,
              capturedAt: new Date().toISOString(),
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to resolve embed snapshot.' })
          }
        }

        if (req.method === 'POST' && pathname === '/api/embed/snapshot/capture') {
          try {
            const body = await readJson(req)
            const targetUrlRaw = typeof body.url === 'string' ? body.url : ''
            if (!targetUrlRaw) {
              return sendJson(res, 400, { error: 'url is required.' })
            }
            const targetUrl = new URL(targetUrlRaw)
            const provider = normalizeCaptureProvider(body.provider)
            const targets = normalizeCaptureTargets(body.targets)
            const force = body.force === true

            const captures = []
            for (const target of targets) {
              const capture = await captureEmbedSnapshotTarget(targetUrl.toString(), target, provider, force)
              captures.push(capture)
            }

            const readyCount = captures.filter((capture) => capture.status === 'ready').length
            return sendJson(res, 200, {
              ok: readyCount > 0,
              url: targetUrl.toString(),
              provider,
              captures,
              capturedAt: new Date().toISOString(),
              reason: readyCount > 0 ? undefined : 'Failed to capture snapshots for all targets.',
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to capture embed snapshots.' })
          }
        }

        if (req.method === 'POST' && pathname === '/api/embed/live-session') {
          try {
            const body = await readJson(req)
            const targetUrlRaw = typeof body.url === 'string' ? body.url : ''
            if (!targetUrlRaw) {
              return sendJson(res, 400, { error: 'url is required.' })
            }
            const targetUrl = new URL(targetUrlRaw)
            const session = await createEmbedLiveSession(targetUrl.toString())

            if (!session) {
              return sendJson(res, 501, {
                error:
                  'Live provider not configured. Set EMBED_LIVE_TEMPLATE or HYPERBEAM_API_KEY.',
              })
            }

            return sendJson(res, 200, {
              ok: true,
              url: targetUrl.toString(),
              sessionUrl: session.sessionUrl,
              sessionId: session.sessionId,
              provider: session.provider,
              expiresAt: session.expiresAt,
              startedAt: new Date().toISOString(),
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to start live session.' })
          }
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/embed/live-session/')) {
          const sessionId = decodeURIComponent(pathname.replace('/api/embed/live-session/', '').trim())
          await deleteEmbedLiveSession(sessionId)
          return sendJson(res, 200, { ok: true })
        }

        if (req.method === 'POST' && pathname === '/api/projects/create') {
          try {
            const body = await readJson(req)
            const rawId = typeof body.id === 'string' ? body.id : ''
            const label = typeof body.label === 'string' ? body.label : rawId
            if (!rawId) {
              return sendJson(res, 400, { error: 'Project id is required.' })
            }
            const projectId = slugify(rawId)
            await ensureProjectScaffold(projectId, label)
            return sendJson(res, 200, { ok: true, projectId })
          } catch (error) {
            return sendJson(res, 500, { error: error?.message || 'Failed to create project.' })
          }
        }

        if (req.method === 'POST' && pathname === '/api/paper/import') {
          try {
            const body = await readJson(req)
            const projectId = typeof body.projectId === 'string' ? body.projectId : ''
            if (!projectId) {
              return sendJson(res, 400, { error: 'projectId is required.' })
            }

            let jsx = typeof body.jsx === 'string' ? body.jsx : ''
            let name = typeof body.name === 'string' ? body.name : ''
            let selectionMeta = body.selection || null
            let basicInfo = null

            if (!jsx) {
              const client = await resolvePaperMcpClient()
              if (!client) {
                return sendJson(res, 501, {
                  error: 'Paper MCP client not available server-side. Set PAPER_MCP_CLIENT_MODULE or inject global mcp client.',
                })
              }

              try {
                basicInfo = await client.getBasicInfo?.()
              } catch {
                basicInfo = null
              }

              const selection = await importPaperSelection(client, { format: body.format || 'tailwind' })
              jsx = selection.jsx
              name = name || selection.name
              selectionMeta = {
                name: selection.name,
                nodeId: selection.nodeId,
                width: selection.width,
                height: selection.height,
                fileName: basicInfo?.fileName,
                pageName: basicInfo?.pageName,
              }
            }

            if (!jsx) {
              return sendJson(res, 400, { error: 'jsx is required.' })
            }

            const projectDir = await ensureProjectScaffold(projectId, body.label)
            const componentDir = path.join(projectDir, 'components', 'paper')
            const configDir = path.join(projectDir, 'configs', 'paper')

            const baseName =
              typeof name === 'string' && name.trim()
                ? name.trim()
                : 'PaperComponent'
            const { slug, componentName } = uniqueName(baseName, componentDir, configDir)

            const importPath = `@project/${projectId}/components/paper/${componentName}`
            const descriptionParts = []
            if (selectionMeta?.fileName) descriptionParts.push(selectionMeta.fileName)
            if (selectionMeta?.nodeId) descriptionParts.push(`node ${selectionMeta.nodeId}`)
            const description = descriptionParts.length > 0
              ? `Imported from Paper (${descriptionParts.join(' · ')})`
              : 'Imported from Paper MCP'

            const entry = createPaperGalleryEntry({
              id: `paper/${slug}`,
              name: componentName,
              importPath,
              description,
            })

            const headerLines = [
              '/**',
              ' * from Paper',
              body.source?.url ? ` * ${body.source.url}` : null,
              body.source?.importedAt ? ` * on ${body.source.importedAt}` : null,
              ' */',
              '',
            ].filter(Boolean)

            const componentSource = `${headerLines.join('\n')}${formatPaperComponentSource(jsx, componentName)}`
            const entrySource = formatPaperGalleryEntrySource(entry, {
              exportName: `${componentName}Entry`,
              coreImportPath: '../../../core',
            })

            await fs.writeFile(path.join(componentDir, `${componentName}.tsx`), componentSource)
            await fs.writeFile(path.join(configDir, `${slug}.gallery.ts`), entrySource)
            const kind = body.kind === 'page' ? 'page' : 'ui'
            await updateProjectRegistry(projectDir, entry.id, kind)

            return sendJson(res, 200, {
              ok: true,
              componentId: entry.id,
              componentName,
              importPath,
              reload: true,
              selection: selectionMeta,
            })
          } catch (error) {
            return sendJson(res, 500, { error: error?.message || 'Paper import failed.' })
          }
        }

        return next()
      })
    },
  }
}

function copilotKitPlugin() {
  return {
    name: 'copilotkit-runtime',
    configureServer(server) {
      let initialized = false
      let runtimeHandler: ((req: unknown, res: unknown) => Promise<void>) | null = null
      let runtimeError: string | null = null

      const ensureRuntime = async () => {
        if (initialized) return
        initialized = true

        try {
          const runtimeModule = await import('@copilotkit/runtime')
          const {
            CopilotRuntime,
            AnthropicAdapter,
            OpenAIAdapter,
            copilotRuntimeNodeHttpEndpoint,
          } =
            runtimeModule
          const provider = COPILOTKIT_PROVIDER

          if (provider === 'openrouter') {
            const openRouterApiKey =
              typeof process.env.OPENROUTER_API_KEY === 'string'
                ? process.env.OPENROUTER_API_KEY.trim()
                : ''
            if (!openRouterApiKey || openRouterApiKey === 'sk-or-your-key') {
              runtimeError = `OPENROUTER_API_KEY is not configured. Set it in ${ENV_LOCAL_PATH} or export it in your shell.`
              return
            }

            if (!OpenAIAdapter) {
              runtimeError =
                'CopilotKit OpenAIAdapter is not available. Upgrade @copilotkit/runtime.'
              return
            }

            const openaiSdkModule = await import('openai')
            const OpenAI =
              openaiSdkModule?.default ||
              openaiSdkModule?.OpenAI ||
              openaiSdkModule
            if (!OpenAI) {
              runtimeError = 'OpenAI client was not found. Install openai.'
              return
            }

            const openai = new OpenAI({
              apiKey: openRouterApiKey,
              baseURL: OPENROUTER_BASE_URL,
              defaultHeaders: {
                'HTTP-Referer': OPENROUTER_SITE_URL,
                'X-Title': OPENROUTER_SITE_NAME,
              },
            })

            const serviceAdapter = new OpenAIAdapter({
              openai,
              model: COPILOTKIT_OPENROUTER_MODEL,
            })

            const runtime = new CopilotRuntime()
            runtimeHandler = copilotRuntimeNodeHttpEndpoint({
              endpoint: '/api/copilotkit',
              runtime,
              serviceAdapter,
            }) as (req: unknown, res: unknown) => Promise<void>
            return
          }

          const anthropicApiKey =
            typeof process.env.ANTHROPIC_API_KEY === 'string'
              ? process.env.ANTHROPIC_API_KEY.trim()
              : ''
          if (!anthropicApiKey || anthropicApiKey === 'sk-ant-your-key') {
            runtimeError = `ANTHROPIC_API_KEY is not configured. Set it in ${ENV_LOCAL_PATH} or export it in your shell.`
            return
          }

          const anthropicModule = await import('@anthropic-ai/sdk')
          const Anthropic =
            anthropicModule?.default ||
            anthropicModule?.Anthropic ||
            anthropicModule

          const anthropic = new Anthropic({
            apiKey: anthropicApiKey,
          })

          const serviceAdapter = new AnthropicAdapter({
            anthropic,
            model: COPILOTKIT_ANTHROPIC_MODEL,
          })

          const runtime = new CopilotRuntime()
          runtimeHandler = copilotRuntimeNodeHttpEndpoint({
            endpoint: '/api/copilotkit',
            runtime,
            serviceAdapter,
          }) as (req: unknown, res: unknown) => Promise<void>
        } catch (error) {
          runtimeError =
            error?.message ||
            'CopilotKit runtime is unavailable. Install runtime deps and check provider API keys.'
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const requestUrl = typeof req.url === 'string' ? req.url : ''
        if (!requestUrl.startsWith('/api/copilotkit')) {
          return next()
        }
        try {
          await ensureRuntime()
          if (!runtimeHandler) {
            return sendJson(res, 501, {
              error:
                runtimeError ||
                'CopilotKit runtime is not initialized.',
            })
          }
          await runtimeHandler(req, res)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

const optionalCopilotAliases: Array<{ find: string | RegExp; replacement: string }> = []

if (!HAS_COPILOTKIT_REACT_CORE) {
  optionalCopilotAliases.push({
    find: '@copilotkit/react-core',
    replacement: path.resolve(__dirname, './components/agent/copilotkit-shims/react-core.tsx'),
  })
}

if (!HAS_COPILOTKIT_REACT_UI) {
  optionalCopilotAliases.push(
    {
      find: '@copilotkit/react-ui/styles.css',
      replacement: path.resolve(
        __dirname,
        './components/agent/copilotkit-shims/react-ui-styles.css'
      ),
    },
    {
      find: '@copilotkit/react-ui',
      replacement: path.resolve(__dirname, './components/agent/copilotkit-shims/react-ui.tsx'),
    }
  )
}

export default defineConfig({
  plugins: [react(), paperImportPlugin(), copilotKitPlugin()],
  envDir: __dirname,
  resolve: {
    alias: [
      {
        find: '@inertiajs/react',
        replacement: path.resolve(__dirname, './demo-thicket/shims/inertia-react.tsx'),
      },
      {
        find: /^@thicket\/(.*)$/,
        replacement: path.resolve(__dirname, './demo-thicket/$1'),
      },
      {
        find: '@thicket',
        replacement: path.resolve(__dirname, './demo-thicket'),
      },
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(__dirname, './$1'),
      },
      {
        find: /^@project\/(.*)$/,
        replacement: path.resolve(__dirname, './projects/$1'),
      },
      {
        find: '@project',
        replacement: path.resolve(__dirname, './projects'),
      },
      ...optionalCopilotAliases,
    ],
  },
  server: {
    fs: {
      allow: [__dirname],
    },
  },
  root: 'demo',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
