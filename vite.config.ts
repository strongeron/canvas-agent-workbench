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
import * as nodePty from 'node-pty'
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
const LOCAL_SCAN_ALLOWED_ROOTS = [
  __dirname,
  ...String(process.env.LOCAL_SCAN_ALLOWED_ROOTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => path.resolve(value)),
  ...(process.env.HOME ? [path.resolve(process.env.HOME)] : []),
]
const LOCAL_SCAN_MAX_FILES = Number(process.env.LOCAL_SCAN_MAX_FILES || 4000)
const LOCAL_SCAN_MAX_COMPONENTS = Number(process.env.LOCAL_SCAN_MAX_COMPONENTS || 120)
const LOCAL_SCAN_AUTO_SYNC =
  String(process.env.LOCAL_SCAN_AUTO_SYNC || 'true').trim().toLowerCase() !== 'false'
const LOCAL_SCAN_WATCH_DEBOUNCE_MS = Number(process.env.LOCAL_SCAN_WATCH_DEBOUNCE_MS || 700)
const LOCAL_SCAN_IGNORE_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.cache',
  '.idea',
  '.vscode',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'out',
  'tmp',
  'vendor',
])
const LOCAL_SCAN_SOURCE_EXTENSIONS = new Set(['.tsx', '.jsx'])
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
  process.env.COPILOTKIT_OPENROUTER_MODEL || 'openai/gpt-4.1-mini'
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || 'http://localhost:5173'
const OPENROUTER_SITE_NAME = process.env.OPENROUTER_SITE_NAME || 'gallery-poc'
const TAVILY_API_KEY = process.env.TAVILY_API_KEY
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
const GIPHY_API_KEY = process.env.GIPHY_API_KEY
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN
const PINTEREST_COUNTRY_CODE = /^[A-Za-z]{2}$/.test(String(process.env.PINTEREST_COUNTRY_CODE || '').trim())
  ? String(process.env.PINTEREST_COUNTRY_CODE).trim().toUpperCase()
  : 'US'
const PINTEREST_LOCALE = /^[a-z]{2}-[A-Z]{2}$/.test(String(process.env.PINTEREST_LOCALE || '').trim())
  ? String(process.env.PINTEREST_LOCALE).trim()
  : 'en-US'
const PINTEREST_ENABLE_PARTNER_SEARCH = String(process.env.PINTEREST_ENABLE_PARTNER_SEARCH || 'true').trim().toLowerCase() !== 'false'
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

const CANVAS_AGENT_DEFINITIONS = [
  {
    id: 'codex',
    label: 'Codex CLI',
    description: 'OpenAI Codex CLI session in the current workspace.',
    launchCommand: 'codex',
  },
  {
    id: 'claude',
    label: 'Claude Code',
    description: 'Anthropic Claude Code session in the current workspace.',
    launchCommand: 'claude',
  },
]

const CANVAS_AGENT_RUNTIME_ROOT = path.join(__dirname, '.canvas-agent', 'servers')
const CANVAS_AGENT_DEFAULT_TERMINAL = {
  cols: 96,
  rows: 28,
}

const CANVAS_AGENT_TOOL_COMMAND =
  process.platform === 'win32' ? 'node .\\\\bin\\\\canvas-agent' : 'bin/canvas-agent'
const CANVAS_MCP_SERVER_NAME = 'canvas'
const CANVAS_MCP_SERVER_ENTRY = path.join(__dirname, 'bin', 'canvas-mcp-server')
const CANVAS_AGENT_OUTPUT_LIMIT = 200_000
const CANVAS_AGENT_TRANSCRIPT_LIMIT = 240
const CANVAS_AGENT_STATE_HISTORY_LIMIT = 80
const CANVAS_AGENT_MCP_GUIDANCE =
  'This session is attached to a live canvas MCP server named "canvas". When the task touches the live canvas, primitives, artboards, or board export, prefer MCP tools before Bash or file edits. Start with get_canvas_context or get_canvas_state, inspect primitives with list_primitives or get_primitive, create boards with create_artboard and create_primitive_item, then use update_item/select_items as needed. Use export_board only for primitive-only artboards. Use shell and file edits only for repo code changes, tests, or debugging outside the scene graph.'
const CANVAS_AGENT_CODEX_BOOTSTRAP_PROMPT = `${CANVAS_AGENT_MCP_GUIDANCE} Acknowledge briefly that the canvas MCP tools are available, then wait for the next user task.`

function deriveCanvasNextZIndex(items) {
  return items.reduce((max, item) => Math.max(max, Number(item?.zIndex || 0) + 1), 1)
}

function normalizeCanvasStateSnapshot(input) {
  const items = Array.isArray(input?.items) ? input.items : []
  const groups = Array.isArray(input?.groups) ? input.groups : []
  const selectedIds = Array.isArray(input?.selectedIds) ? input.selectedIds : []
  const nextZIndex = Number.isFinite(input?.nextZIndex)
    ? Math.max(input.nextZIndex, deriveCanvasNextZIndex(items))
    : deriveCanvasNextZIndex(items)

  return {
    items,
    groups,
    selectedIds,
    nextZIndex,
  }
}

function normalizeCanvasAgentPrimitivePropSchema(input) {
  if (!input || typeof input !== 'object' || typeof input.type !== 'string') return null
  return {
    type: input.type,
    label: typeof input.label === 'string' ? input.label : undefined,
    defaultValue: input.defaultValue,
    options: Array.isArray(input.options)
      ? input.options
          .filter((option) => option && typeof option === 'object')
          .map((option) => ({
            value: option.value,
            label: typeof option.label === 'string' ? option.label : String(option.value ?? ''),
          }))
      : undefined,
    min: Number.isFinite(input.min) ? Number(input.min) : undefined,
    max: Number.isFinite(input.max) ? Number(input.max) : undefined,
    step: Number.isFinite(input.step) ? Number(input.step) : undefined,
    placeholder: typeof input.placeholder === 'string' ? input.placeholder : undefined,
    optional: typeof input.optional === 'boolean' ? input.optional : undefined,
    description: typeof input.description === 'string' ? input.description : undefined,
  }
}

function normalizeCanvasAgentPrimitiveRecord(input) {
  if (!input || typeof input !== 'object') return null
  const primitiveId =
    typeof input.primitiveId === 'string' && input.primitiveId.trim() ? input.primitiveId.trim() : ''
  const entryId = typeof input.entryId === 'string' && input.entryId.trim() ? input.entryId.trim() : ''
  const family = typeof input.family === 'string' && input.family.trim() ? input.family.trim() : ''
  const level = input.level === 'composite' ? 'composite' : 'primitive'
  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : entryId
  if (!primitiveId || !entryId || !family || !name) return null

  const propSchema =
    input.propSchema && typeof input.propSchema === 'object'
      ? Object.fromEntries(
          Object.entries(input.propSchema)
            .map(([key, value]) => [key, normalizeCanvasAgentPrimitivePropSchema(value)])
            .filter(([, value]) => Boolean(value))
        )
      : {}

  return {
    primitiveId,
    entryId,
    name,
    description:
      typeof input.description === 'string' && input.description.trim()
        ? input.description.trim()
        : undefined,
    category:
      typeof input.category === 'string' && input.category.trim()
        ? input.category.trim()
        : 'Design System',
    importPath:
      typeof input.importPath === 'string' && input.importPath.trim() ? input.importPath.trim() : '',
    sourceId:
      typeof input.sourceId === 'string' && input.sourceId.trim() ? input.sourceId.trim() : null,
    family,
    level,
    htmlTag: typeof input.htmlTag === 'string' && input.htmlTag.trim() ? input.htmlTag.trim() : null,
    exportable: input.exportable !== false,
    tokenUsage: Array.isArray(input.tokenUsage)
      ? input.tokenUsage
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean)
      : [],
    defaultSize:
      input.defaultSize &&
      typeof input.defaultSize === 'object' &&
      Number.isFinite(input.defaultSize.width) &&
      Number.isFinite(input.defaultSize.height)
        ? {
            width: Number(input.defaultSize.width),
            height: Number(input.defaultSize.height),
          }
        : null,
    propSchema,
    variants: Array.isArray(input.variants)
      ? input.variants
          .filter((variant) => variant && typeof variant === 'object')
          .map((variant) => ({
            name:
              typeof variant.name === 'string' && variant.name.trim() ? variant.name.trim() : 'Default',
            description:
              typeof variant.description === 'string' && variant.description.trim()
                ? variant.description.trim()
                : '',
            props: variant.props && typeof variant.props === 'object' ? variant.props : {},
            interactiveSchema:
              variant.interactiveSchema && typeof variant.interactiveSchema === 'object'
                ? Object.fromEntries(
                    Object.entries(variant.interactiveSchema)
                      .map(([key, value]) => [key, normalizeCanvasAgentPrimitivePropSchema(value)])
                      .filter(([, value]) => Boolean(value))
                  )
                : undefined,
          }))
      : [],
  }
}

function normalizeCanvasAgentPrimitiveList(input) {
  if (!Array.isArray(input)) return []
  return input.map((entry) => normalizeCanvasAgentPrimitiveRecord(entry)).filter(Boolean)
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`
}

function collectCanvasCascadeDeleteIds(state, ids) {
  const idsToRemove = new Set(Array.isArray(ids) ? ids : [])
  state.items.forEach((item) => {
    if (item?.parentId && idsToRemove.has(item.parentId)) {
      idsToRemove.add(item.id)
    }
  })
  return idsToRemove
}

function applyCanvasRemoteOperationToState(state, operation) {
  const current = normalizeCanvasStateSnapshot(state)

  if (!operation || typeof operation !== 'object' || typeof operation.type !== 'string') {
    return current
  }

  switch (operation.type) {
    case 'create_item': {
      if (!operation.item || typeof operation.item !== 'object' || !operation.item.id) {
        return current
      }
      const existingIndex = current.items.findIndex((item) => item.id === operation.item.id)
      const nextItems =
        existingIndex >= 0
          ? current.items.map((item, index) => (index === existingIndex ? operation.item : item))
          : [...current.items, operation.item]

      return {
        ...current,
        items: nextItems,
        nextZIndex: Math.max(current.nextZIndex, deriveCanvasNextZIndex(nextItems)),
        selectedIds: operation.select ? [operation.item.id] : current.selectedIds,
      }
    }
    case 'update_item':
      if (!operation.id) return current
      return {
        ...current,
        items: current.items.map((item) =>
          item.id === operation.id ? { ...item, ...operation.updates } : item
        ),
      }
    case 'delete_items': {
      const idsToRemove = collectCanvasCascadeDeleteIds(current, operation.ids)
      return {
        ...current,
        items: current.items.filter((item) => !idsToRemove.has(item.id)),
        selectedIds: current.selectedIds.filter((id) => !idsToRemove.has(id)),
      }
    }
    case 'select_items':
      return {
        ...current,
        selectedIds: Array.isArray(operation.ids) ? operation.ids : [],
      }
    case 'clear_canvas':
      return {
        items: [],
        groups: [],
        nextZIndex: 1,
        selectedIds: [],
      }
    default:
      return current
  }
}

function writeSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`)
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function trimCanvasAgentOutput(value) {
  if (typeof value !== 'string') return ''
  if (value.length <= CANVAS_AGENT_OUTPUT_LIMIT) return value
  return value.slice(value.length - CANVAS_AGENT_OUTPUT_LIMIT)
}

function trimCanvasAgentTranscript(entries) {
  if (!Array.isArray(entries)) return []
  if (entries.length <= CANVAS_AGENT_TRANSCRIPT_LIMIT) return entries
  return entries.slice(entries.length - CANVAS_AGENT_TRANSCRIPT_LIMIT)
}

function trimCanvasAgentStateHistory(entries) {
  if (!Array.isArray(entries)) return []
  if (entries.length <= CANVAS_AGENT_STATE_HISTORY_LIMIT) return entries
  return entries.slice(entries.length - CANVAS_AGENT_STATE_HISTORY_LIMIT)
}

function sanitizeCanvasAgentTranscriptText(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, 1_000)
}

function resolveCanvasAgentShell() {
  const preferredShell = process.env.SHELL?.trim()
  if (preferredShell && existsSync(preferredShell)) {
    return preferredShell
  }

  const shellFallbacks =
    process.platform === 'darwin'
      ? ['/bin/zsh', '/bin/bash', '/bin/sh']
      : ['/bin/bash', '/bin/sh']

  return shellFallbacks.find((candidate) => existsSync(candidate)) || '/bin/sh'
}

function buildCanvasAgentEnv(cwd, shell) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => typeof value === 'string')
  )

  return {
    ...env,
    COLORTERM: 'truecolor',
    PWD: cwd,
    SHELL: shell,
    TERM: 'xterm-256color',
  }
}

function resolveCanvasAgentServerUrl(server) {
  const localUrl = server.resolvedUrls?.local?.[0]
  if (typeof localUrl === 'string' && localUrl.length > 0) {
    return localUrl.replace(/\/$/, '')
  }

  const address = server.httpServer?.address?.()
  if (address && typeof address === 'object' && typeof address.port === 'number') {
    return `http://127.0.0.1:${address.port}`
  }

  return 'http://127.0.0.1:5173'
}

function formatTomlInlineTable(record) {
  return `{${Object.entries(record)
    .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
    .join(',')}}`
}

function buildCanvasAgentMcpServerEnv(session, sessionDir, toolCommand) {
  return {
    CANVAS_AGENT_PROJECT_ID: session.projectId,
    CANVAS_AGENT_SESSION_ID: session.id,
    CANVAS_AGENT_SESSION_DIR: sessionDir,
    CANVAS_AGENT_TOOL_COMMAND: toolCommand || CANVAS_AGENT_TOOL_COMMAND,
  }
}

function buildClaudeCanvasMcpConfig(session, sessionDir, toolCommand) {
  return {
    mcpServers: {
      [CANVAS_MCP_SERVER_NAME]: {
        type: 'stdio',
        command: process.execPath,
        args: [CANVAS_MCP_SERVER_ENTRY],
        env: buildCanvasAgentMcpServerEnv(session, sessionDir, toolCommand),
      },
    },
  }
}

function buildCanvasAgentLaunchMetadata(definition, session, sessionDir, toolCommand) {
  const mcpEnv = buildCanvasAgentMcpServerEnv(session, sessionDir, toolCommand)
  const mcpServerCommand = `${process.execPath} ${CANVAS_MCP_SERVER_ENTRY}`
  const launchCommandBase = definition.launchCommand

  if (definition.id === 'claude') {
    const mcpConfigPath = path.join(sessionDir, 'canvas-mcp.json')
    const agentCommand = `${launchCommandBase} --append-system-prompt ${shellQuote(CANVAS_AGENT_MCP_GUIDANCE)} --strict-mcp-config --mcp-config ${shellQuote(mcpConfigPath)}`
    return {
      agentCommand,
      launchCommand: `cd ${JSON.stringify(session.cwd)} && ${agentCommand}`,
      mcpServerName: CANVAS_MCP_SERVER_NAME,
      mcpServerCommand,
      mcpConfigPath,
      mcpConfigContent: JSON.stringify(
        buildClaudeCanvasMcpConfig(session, sessionDir, toolCommand),
        null,
        2
      ),
      startupGuidance: CANVAS_AGENT_MCP_GUIDANCE,
    }
  }

  const codexOverrides = [
    `mcp_servers.${CANVAS_MCP_SERVER_NAME}.command=${JSON.stringify(process.execPath)}`,
    `mcp_servers.${CANVAS_MCP_SERVER_NAME}.args=${JSON.stringify([CANVAS_MCP_SERVER_ENTRY])}`,
    `mcp_servers.${CANVAS_MCP_SERVER_NAME}.env=${formatTomlInlineTable(mcpEnv)}`,
    `mcp_servers.${CANVAS_MCP_SERVER_NAME}.cwd=${JSON.stringify(session.cwd)}`,
  ]
  const overrideArgs = codexOverrides.map((override) => `-c ${shellQuote(override)}`).join(' ')
  const agentCommand = `${launchCommandBase} ${overrideArgs} ${shellQuote(CANVAS_AGENT_CODEX_BOOTSTRAP_PROMPT)}`.trim()
  return {
    agentCommand,
    launchCommand: `cd ${JSON.stringify(session.cwd)} && ${agentCommand}`,
    mcpServerName: CANVAS_MCP_SERVER_NAME,
    mcpServerCommand,
    mcpConfigPath: null,
    mcpConfigContent: null,
    startupGuidance: CANVAS_AGENT_MCP_GUIDANCE,
  }
}

function resolveCanvasAgentSpawn(definition, session) {
  const cwd = session?.cwd || __dirname
  const command = session?.agentCommand || definition.launchCommand
  if (process.platform === 'win32') {
    const shell = process.env.COMSPEC || 'cmd.exe'
    return {
      shell,
      args: ['/d', '/s', '/c', command],
      cwd,
    }
  }

  const shell = resolveCanvasAgentShell()
  return {
    shell,
    args: ['-lic', command],
    cwd,
  }
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

async function readProjectMeta(projectDir, projectId) {
  const metaPath = path.join(projectDir, 'project.json')
  if (!existsSync(metaPath)) {
    return { label: projectId }
  }

  try {
    const raw = await fs.readFile(metaPath, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : { label: projectId }
  } catch {
    return { label: projectId }
  }
}

async function writeProjectMeta(projectDir, meta) {
  const metaPath = path.join(projectDir, 'project.json')
  const nextRaw = JSON.stringify(meta, null, 2)
  if (existsSync(metaPath)) {
    try {
      const currentRaw = await fs.readFile(metaPath, 'utf8')
      if (currentRaw === nextRaw) return false
    } catch {
      // fall through and rewrite malformed metadata
    }
  }

  await fs.writeFile(metaPath, nextRaw)
  return true
}

async function writeTextFileIfChanged(filePath, content) {
  if (existsSync(filePath)) {
    try {
      const current = await fs.readFile(filePath, 'utf8')
      if (current === content) return false
    } catch {
      // fall through and rewrite
    }
  }

  await fs.writeFile(filePath, content)
  return true
}

function normalizeLocalScanState(localScan) {
  if (!localScan || typeof localScan !== 'object') return null

  const repoPath =
    typeof localScan.repoPath === 'string' && localScan.repoPath.trim()
      ? path.resolve(localScan.repoPath.trim())
      : ''
  if (!repoPath) return null

  const detectedCount = Number(localScan.detectedCount)
  const createdEntries = Number(localScan.createdEntries)
  const scannedFiles = Number(localScan.scannedFiles)
  const enabled = localScan.enabled !== false

  return {
    enabled,
    watching: enabled && LOCAL_SCAN_AUTO_SYNC,
    repoPath,
    repoLabel:
      typeof localScan.repoLabel === 'string' && localScan.repoLabel.trim()
        ? localScan.repoLabel.trim()
        : path.basename(repoPath),
    scannedAt:
      typeof localScan.scannedAt === 'string' && localScan.scannedAt.trim()
        ? localScan.scannedAt
        : null,
    detectedCount: Number.isFinite(detectedCount) ? detectedCount : null,
    createdEntries: Number.isFinite(createdEntries) ? createdEntries : null,
    scannedFiles: Number.isFinite(scannedFiles) ? scannedFiles : null,
  }
}

async function listProjects() {
  if (!existsSync(PROJECTS_ROOT)) return []
  const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true })

  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const projectId = entry.name
        const meta = await readProjectMeta(path.join(PROJECTS_ROOT, projectId), projectId)
        const label =
          typeof meta?.label === 'string' && meta.label.trim()
            ? meta.label.trim()
            : projectId

        return {
          id: projectId,
          label,
          localScan: normalizeLocalScanState(meta?.localScan),
        }
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

async function updateProjectRegistryBulk(projectDir, entryIds, kind) {
  const normalizedIds = Array.from(
    new Set(
      (entryIds || [])
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter(Boolean)
    )
  )
  if (normalizedIds.length === 0) return

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
  const bucketSet = new Set(normalized[bucket])
  normalizedIds.forEach((id) => bucketSet.add(id))
  normalized[bucket] = Array.from(bucketSet)
  normalized[other] = normalized[other].filter((id) => !normalizedIds.includes(id))

  await fs.writeFile(registryPath, JSON.stringify(normalized, null, 2))
}

async function syncProjectLocalScanRegistry(projectDir, entryIds) {
  const normalizedIds = Array.from(
    new Set(
      (entryIds || [])
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter(Boolean)
    )
  )
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

  const nextRegistry = {
    ui: [
      ...normalized.ui.filter((id) => typeof id === 'string' && !id.startsWith('local-scan/')),
      ...normalizedIds,
    ],
    page: normalized.page.filter((id) => typeof id === 'string' && !id.startsWith('local-scan/')),
  }

  const nextRaw = JSON.stringify(nextRegistry, null, 2)
  if (existsSync(registryPath)) {
    try {
      const currentRaw = await fs.readFile(registryPath, 'utf8')
      if (currentRaw === nextRaw) return false
    } catch {
      // fall through and rewrite malformed registry
    }
  }

  await fs.writeFile(registryPath, nextRaw)
  return true
}

function shouldHandleLocalScanPath(filePath) {
  const normalized = path.resolve(filePath)
  const segments = normalized.split(path.sep).filter(Boolean)
  if (segments.some((segment) => LOCAL_SCAN_IGNORE_DIRS.has(segment))) {
    return false
  }

  const ext = path.extname(normalized).toLowerCase()
  if (!ext) return true
  return LOCAL_SCAN_SOURCE_EXTENSIONS.has(ext)
}

function getCommonPathPrefix(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return null
  const segmentLists = paths.map((value) => path.resolve(value).split(path.sep).filter(Boolean))
  const firstSegments = segmentLists[0]
  const shared = []

  for (let index = 0; index < firstSegments.length; index += 1) {
    const segment = firstSegments[index]
    if (segmentLists.every((segments) => segments[index] === segment)) {
      shared.push(segment)
      continue
    }
    break
  }

  if (shared.length === 0) {
    return path.parse(path.resolve(paths[0])).root
  }

  const root = path.parse(path.resolve(paths[0])).root
  return path.join(root, ...shared)
}

function findLocalScanRootCandidate(startPath) {
  const markers = [
    'package.json',
    'pnpm-workspace.yaml',
    'package-lock.json',
    'yarn.lock',
    'tsconfig.json',
    'vite.config.ts',
    'vite.config.js',
    'next.config.ts',
    'next.config.js',
  ]
  let current = path.resolve(startPath)

  for (let depth = 0; depth < 5; depth += 1) {
    if (markers.some((marker) => existsSync(path.join(current, marker)))) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return path.resolve(startPath)
}

async function inferLocalScanProjectFromFiles(projectDir, projectId, label) {
  const localConfigDir = path.join(projectDir, 'configs', 'local')
  if (!existsSync(localConfigDir)) return null

  const configFiles = (await fs.readdir(localConfigDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.startsWith('scan-') && entry.name.endsWith('.gallery.ts'))
    .map((entry) => path.join(localConfigDir, entry.name))

  if (configFiles.length === 0) return null

  const sourcePaths = []
  for (const filePath of configFiles.slice(0, 40)) {
    const raw = await fs.readFile(filePath, 'utf8').catch(() => '')
    if (!raw) continue
    const matches = raw.matchAll(/"sourcePath":\s*"([^"]+)"/g)
    for (const match of matches) {
      try {
        sourcePaths.push(JSON.parse(`"${match[1]}"`))
      } catch {
        sourcePaths.push(match[1])
      }
    }
  }

  if (sourcePaths.length === 0) return null
  const sharedPath = getCommonPathPrefix(sourcePaths.map((value) => path.dirname(value)))
  const repoPath = sharedPath ? findLocalScanRootCandidate(sharedPath) : null
  if (!repoPath) return null

  return {
    projectId,
    projectDir,
    label,
    repoPath,
    repoLabel: path.basename(repoPath),
  }
}

async function listLocalScanProjects() {
  if (!existsSync(PROJECTS_ROOT)) return []
  const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true })
  const projects = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const projectId = entry.name
    const projectDir = path.join(PROJECTS_ROOT, projectId)
    const meta = await readProjectMeta(projectDir, projectId)
    const localScan = meta?.localScan
    const label =
      typeof meta?.label === 'string' && meta.label.trim()
        ? meta.label.trim()
        : projectId

    if (localScan && typeof localScan === 'object') {
      const repoPathRaw =
        typeof localScan.repoPath === 'string' ? localScan.repoPath.trim() : ''
      if (repoPathRaw && localScan.enabled !== false) {
        const normalizedRepoPath = findLocalScanRootCandidate(path.resolve(repoPathRaw))
        const repoLabel =
          typeof localScan.repoLabel === 'string' && localScan.repoLabel.trim()
            ? localScan.repoLabel.trim()
            : path.basename(normalizedRepoPath)
        if (normalizedRepoPath !== path.resolve(repoPathRaw) || repoLabel !== localScan.repoLabel) {
          await writeProjectMeta(projectDir, {
            ...meta,
            label,
            localScan: {
              ...localScan,
              enabled: true,
              repoPath: normalizedRepoPath,
              repoLabel: path.basename(normalizedRepoPath),
            },
          })
        }
        projects.push({
          projectId,
          projectDir,
          label,
          repoPath: normalizedRepoPath,
          repoLabel: path.basename(normalizedRepoPath),
        })
        continue
      }
    }

    const inferredProject = await inferLocalScanProjectFromFiles(projectDir, projectId, label)
    if (inferredProject) {
      await writeProjectMeta(projectDir, {
        ...meta,
        label,
        localScan: {
          ...(meta?.localScan && typeof meta.localScan === 'object' ? meta.localScan : {}),
          enabled: true,
          repoPath: inferredProject.repoPath,
          repoLabel: inferredProject.repoLabel,
          inferredAt: new Date().toISOString(),
        },
      })
      projects.push(inferredProject)
    }
  }

  return projects
}

function isSubPath(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath)
  if (!relative) return true
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

function assertLocalScanPathAllowed(repoPath) {
  const normalizedRepoPath = path.resolve(repoPath)
  const allowed = LOCAL_SCAN_ALLOWED_ROOTS.some((rootPath) => isSubPath(rootPath, normalizedRepoPath))
  if (!allowed) {
    const listed = LOCAL_SCAN_ALLOWED_ROOTS.join(', ')
    throw new Error(
      `Path is outside allowed scanner roots. Configure LOCAL_SCAN_ALLOWED_ROOTS. Allowed: ${listed}`
    )
  }
}

function normalizeFsPathForUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function toFsModuleUrl(filePath) {
  return `/@fs${encodeURI(normalizeFsPathForUrl(filePath))}`
}

function inferLocalComponentNameFromFile(filePath) {
  const baseName = path.basename(filePath, path.extname(filePath))
  return toPascalCase(baseName || 'LocalComponent')
}

function extractReactComponentExports(source, filePath) {
  const results = []
  const seen = new Set()

  const pushExport = (componentName, exportName) => {
    const key = `${componentName}:${exportName}`
    if (seen.has(key)) return
    seen.add(key)
    results.push({
      componentName,
      exportName,
    })
  }

  const defaultFunctionMatches = source.matchAll(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/g)
  for (const match of defaultFunctionMatches) {
    pushExport(match[1], 'default')
  }

  const defaultClassMatches = source.matchAll(/export\s+default\s+class\s+([A-Z][A-Za-z0-9_]*)/g)
  for (const match of defaultClassMatches) {
    pushExport(match[1], 'default')
  }

  const defaultIdentifierMatches = source.matchAll(/export\s+default\s+([A-Z][A-Za-z0-9_]*)\b/g)
  for (const match of defaultIdentifierMatches) {
    pushExport(match[1], 'default')
  }

  const hasAnonymousDefault =
    /export\s+default\s+function\b(?!\s+[A-Z][A-Za-z0-9_]*)/.test(source) ||
    /export\s+default\s+class\b(?!\s+[A-Z][A-Za-z0-9_]*)/.test(source)
  if (hasAnonymousDefault) {
    pushExport(inferLocalComponentNameFromFile(filePath), 'default')
  }

  const namedMatches = source.matchAll(
    /export\s+(?:const|let|var|function|class)\s+([A-Z][A-Za-z0-9_]*)\b/g
  )
  for (const match of namedMatches) {
    pushExport(match[1], match[1])
  }

  return results
}

async function collectLocalComponentCandidates(repoPath) {
  const queue = [repoPath]
  const files = []

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) continue
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (LOCAL_SCAN_IGNORE_DIRS.has(entry.name)) continue
        queue.push(fullPath)
        continue
      }
      if (!entry.isFile()) continue
      const ext = path.extname(entry.name).toLowerCase()
      if (!LOCAL_SCAN_SOURCE_EXTENSIONS.has(ext)) continue
      files.push(fullPath)
      if (files.length >= LOCAL_SCAN_MAX_FILES) {
        return files
      }
    }
  }

  return files
}

function buildLocalScanProxySource() {
  return `import { Component, useEffect, useMemo, useState } from "react"
import type { ComponentType, ErrorInfo, ReactNode } from "react"

interface LocalScannedComponentProxyProps {
  moduleUrl: string
  exportName?: string
  displayName?: string
  sourcePath?: string
  repoName?: string
}

const NOOP = () => {}

const DEFAULT_PREVIEW_PROPS: Record<string, unknown> = {
  variants: [{ id: "preview", label: "Preview", name: "Preview" }],
  active: "preview",
  onChange: NOOP,
  onPaletteChange: NOOP,
  onFontPairChange: NOOP,
  activePalette: "default",
  activeFontPair: "default",
  theme: "dark",
  minimal: true,
  showPickBadge: false,
}

interface LocalRenderBoundaryProps {
  onError: (message: string) => void
  children: ReactNode
}

interface LocalRenderBoundaryState {
  hasError: boolean
}

class LocalRenderBoundary extends Component<LocalRenderBoundaryProps, LocalRenderBoundaryState> {
  state: LocalRenderBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo) {
    const message =
      error instanceof Error ? error.message : "Component threw during render."
    this.props.onError(message)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default function LocalScannedComponentProxy({
  moduleUrl,
  exportName,
  displayName,
  sourcePath,
  repoName,
  ...passThroughProps
}: LocalScannedComponentProxyProps & Record<string, unknown>) {
  const [LoadedComponent, setLoadedComponent] = useState<ComponentType<any> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)

  const previewProps = useMemo(
    () => ({
      ...DEFAULT_PREVIEW_PROPS,
      ...passThroughProps,
    }),
    [passThroughProps]
  )

  useEffect(() => {
    let active = true
    setLoadedComponent(null)
    setLoadError(null)
    setRenderError(null)

    void (async () => {
      try {
        const mod: Record<string, unknown> = await import(/* @vite-ignore */ moduleUrl)
        const preferred =
          exportName && typeof mod[exportName] !== "undefined"
            ? mod[exportName]
            : mod.default
        if (!preferred || (typeof preferred !== "function" && typeof preferred !== "object")) {
          throw new Error("Export is not a renderable React component.")
        }
        if (active) {
          setLoadedComponent(() => preferred as ComponentType<any>)
        }
      } catch (loadError) {
        if (!active) return
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load local module."
        setLoadError(message)
      }
    })()

    return () => {
      active = false
    }
  }, [moduleUrl, exportName])

  if (LoadedComponent) {
    const Component = LoadedComponent
    return (
      <div className="h-full w-full overflow-auto rounded-lg border border-default bg-white p-3">
        <LocalRenderBoundary onError={setRenderError} key={\`\${moduleUrl}::\${exportName || "default"}\`}>
          <Component {...previewProps} />
        </LocalRenderBoundary>
        {renderError && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {\`Render error: \${renderError}\`}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-lg border border-default bg-surface-50 p-3 text-foreground">
      <div className="text-sm font-semibold">{displayName || "Scanned component"}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {repoName ? \`Repo: \${repoName}\` : "Local repository scan"}
      </div>
      {sourcePath && (
        <div className="mt-2 rounded border border-default bg-white px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {sourcePath}
        </div>
      )}
      <div className="mt-3 text-xs text-muted-foreground">
        {loadError ? \`Load error: \${loadError}\` : "Loading component module..."}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        This preview uses dynamic /@fs import and may fail if repo aliases/dependencies are unavailable.
      </div>
    </div>
  )
}
`
}

function formatLocalScanGalleryEntrySource({
  entryId,
  entryName,
  description,
  importPath,
  exportConstName,
  props,
}) {
  return `import type { GalleryEntry } from "@/core"

export const ${exportConstName}: GalleryEntry<Record<string, unknown>> = {
  id: ${JSON.stringify(entryId)},
  name: ${JSON.stringify(entryName)},
  category: "Local Scan",
  description: ${JSON.stringify(description)},
  importPath: ${JSON.stringify(importPath)},
  layoutSize: "large",
  variants: [
    {
      name: "Default",
      description: ${JSON.stringify(description)},
      status: "wip",
      category: "variant",
      props: ${JSON.stringify(props, null, 2)},
    },
  ],
}
`
}

async function syncLocalScanProject({ repoPath, projectId, projectLabel }) {
  const normalizedRepoPath = path.resolve(repoPath)
  assertLocalScanPathAllowed(normalizedRepoPath)

  let repoStat = null
  try {
    repoStat = await fs.stat(normalizedRepoPath)
  } catch {
    repoStat = null
  }
  if (!repoStat?.isDirectory()) {
    throw new Error('repoPath must point to an existing directory.')
  }

  const repoLabel = path.basename(normalizedRepoPath)
  const normalizedProjectId = slugify(projectId)
  const normalizedProjectLabel = projectLabel?.trim() || normalizedProjectId
  const projectDir = await ensureProjectScaffold(normalizedProjectId, normalizedProjectLabel)
  const localComponentDir = path.join(projectDir, 'components', 'local')
  const localConfigDir = path.join(projectDir, 'configs', 'local')
  await fs.mkdir(localComponentDir, { recursive: true })
  await fs.mkdir(localConfigDir, { recursive: true })

  let changed = false
  changed =
    (await writeTextFileIfChanged(
      path.join(localComponentDir, 'LocalScannedComponentProxy.tsx'),
      buildLocalScanProxySource()
    )) || changed

  const files = await collectLocalComponentCandidates(normalizedRepoPath)
  const candidates = []
  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8').catch(() => '')
    if (!source || !source.includes('export')) continue
    const exports = extractReactComponentExports(source, filePath)
    if (exports.length === 0) continue
    const relativePath = path.relative(normalizedRepoPath, filePath).replace(/\\/g, '/')
    exports.forEach((item) => {
      if (candidates.length >= LOCAL_SCAN_MAX_COMPONENTS) return
      candidates.push({
        componentName: item.componentName,
        exportName: item.exportName,
        filePath,
        relativePath,
      })
    })
    if (candidates.length >= LOCAL_SCAN_MAX_COMPONENTS) break
  }

  const preview = candidates.slice(0, 50).map((item) => ({
    componentName: item.componentName,
    exportName: item.exportName,
    relativePath: item.relativePath,
  }))

  const existingConfigFiles = existsSync(localConfigDir)
    ? (await fs.readdir(localConfigDir, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith('.gallery.ts'))
        .map((entry) => path.join(localConfigDir, entry.name))
    : []
  const nextConfigFiles = new Set()

  const proxyImportPath = `@project/${normalizedProjectId}/components/local/LocalScannedComponentProxy`
  const repoSlug = slugify(repoLabel)
  const createdEntryIds = []

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const relativeSlug = slugify(candidate.relativePath)
    const exportSlug = slugify(candidate.exportName || 'default')
    const entryId = `local-scan/${repoSlug}-${relativeSlug}-${exportSlug}`
    const entryName = `${candidate.componentName} (${repoLabel})`
    const description = `Scanned from ${candidate.relativePath}`
    const exportConstName = `${toPascalCase(
      `${candidate.componentName}-${repoSlug}-${index + 1}`
    )}Entry`
    const configSlug = `scan-${repoSlug}-${relativeSlug}-${exportSlug}`
    const configPath = path.join(localConfigDir, `${configSlug}.gallery.ts`)
    const entrySource = formatLocalScanGalleryEntrySource({
      entryId,
      entryName,
      description,
      importPath: proxyImportPath,
      exportConstName,
      props: {
        displayName: candidate.componentName,
        repoName: repoLabel,
        sourcePath: candidate.filePath,
        moduleUrl: toFsModuleUrl(candidate.filePath),
        exportName: candidate.exportName,
      },
    })

    nextConfigFiles.add(configPath)
    changed = (await writeTextFileIfChanged(configPath, entrySource)) || changed
    createdEntryIds.push(entryId)
  }

  for (const existingFile of existingConfigFiles) {
    if (nextConfigFiles.has(existingFile)) continue
    await fs.rm(existingFile, { force: true })
    changed = true
  }

  changed = (await syncProjectLocalScanRegistry(projectDir, createdEntryIds)) || changed

  const meta = await readProjectMeta(projectDir, normalizedProjectId)
  const nextLocalScan = {
    ...(meta?.localScan && typeof meta.localScan === 'object' ? meta.localScan : {}),
    enabled: true,
    repoPath: normalizedRepoPath,
    repoLabel,
    scannedAt: new Date().toISOString(),
    scannedFiles: files.length,
    detectedCount: candidates.length,
    createdEntries: createdEntryIds.length,
  }
  changed =
    (await writeProjectMeta(projectDir, {
      ...meta,
      label:
        typeof meta?.label === 'string' && meta.label.trim()
          ? meta.label.trim()
          : normalizedProjectLabel,
      localScan: nextLocalScan,
    })) || changed

  return {
    ok: true,
    projectId: normalizedProjectId,
    projectLabel:
      typeof meta?.label === 'string' && meta.label.trim()
        ? meta.label.trim()
        : normalizedProjectLabel,
    repoPath: normalizedRepoPath,
    scannedFiles: files.length,
    detectedCount: candidates.length,
    createdEntries: createdEntryIds.length,
    entries: preview,
    message:
      candidates.length === 0
        ? 'No React component exports were detected (.tsx/.jsx).'
        : undefined,
    localScan: normalizeLocalScanState(nextLocalScan),
    changed,
  }
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

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

async function fetchJsonWithTimeout(url, options = {}) {
  const { timeoutMs = 15000, ...init } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    const text = await response.text()
    let payload = null
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { message: text }
      }
    }
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        `Upstream request failed (${response.status}).`
      throw new Error(message)
    }
    return payload || {}
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeWebSearchProvider(raw) {
  const value = String(raw || 'auto').trim().toLowerCase()
  if (value === 'tavily' || value === 'brave' || value === 'serpapi') return value
  return 'auto'
}

function resolveWebSearchProvider(preferred) {
  const normalized = normalizeWebSearchProvider(preferred)
  if (normalized !== 'auto') return normalized
  if (TAVILY_API_KEY) return 'tavily'
  if (BRAVE_SEARCH_API_KEY) return 'brave'
  if (SERPAPI_API_KEY) return 'serpapi'
  return null
}

function normalizeWebSearchResult(result, provider) {
  const title = String(result?.title || result?.name || '').trim()
  const url = String(result?.url || result?.link || '').trim()
  if (!title || !url) return null
  const snippet = String(result?.snippet || result?.description || result?.content || '').trim()
  const thumbnailUrl = String(
    result?.thumbnailUrl ||
    result?.thumbnail ||
    result?.image ||
    result?.imageUrl ||
    ''
  ).trim()
  let host = null
  try {
    host = new URL(url).hostname
  } catch {
    host = null
  }
  return {
    title,
    url,
    snippet,
    host,
    thumbnailUrl: thumbnailUrl || undefined,
    provider,
  }
}

async function searchWebViaTavily(query, maxResults) {
  if (!TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY is not configured.')
  }
  const payload = await fetchJsonWithTimeout('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: false,
      include_images: true,
    }),
  })
  const results = Array.isArray(payload?.results)
    ? payload.results
        .map((item) =>
          normalizeWebSearchResult(
            {
              title: item?.title,
              url: item?.url,
              content: item?.content,
              imageUrl: item?.image_url,
            },
            'tavily',
          ),
        )
        .filter(Boolean)
    : []
  return {
    provider: 'tavily',
    results: results.slice(0, maxResults),
  }
}

async function searchWebViaBrave(query, maxResults) {
  if (!BRAVE_SEARCH_API_KEY) {
    throw new Error('BRAVE_SEARCH_API_KEY is not configured.')
  }
  const params = new URLSearchParams({
    q: query,
    count: String(maxResults),
  })
  const payload = await fetchJsonWithTimeout(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
    },
  })
  const rows = Array.isArray(payload?.web?.results) ? payload.web.results : []
  const results = rows
    .map((item) =>
      normalizeWebSearchResult(
        {
          title: item?.title,
          url: item?.url,
          description: item?.description,
          thumbnail: item?.thumbnail?.src,
        },
        'brave',
      ),
    )
    .filter(Boolean)
  return {
    provider: 'brave',
    results: results.slice(0, maxResults),
  }
}

async function searchWebViaSerpApi(query, maxResults) {
  if (!SERPAPI_API_KEY) {
    throw new Error('SERPAPI_API_KEY is not configured.')
  }
  const params = new URLSearchParams({
    engine: 'google',
    q: query,
    num: String(maxResults),
    api_key: SERPAPI_API_KEY,
  })
  const payload = await fetchJsonWithTimeout(`https://serpapi.com/search.json?${params.toString()}`)
  const rows = Array.isArray(payload?.organic_results) ? payload.organic_results : []
  const results = rows
    .map((item) =>
      normalizeWebSearchResult(
        {
          title: item?.title,
          link: item?.link,
          snippet: item?.snippet,
          thumbnail: item?.thumbnail,
        },
        'serpapi',
      ),
    )
    .filter(Boolean)
  return {
    provider: 'serpapi',
    results: results.slice(0, maxResults),
  }
}

async function searchWeb(query, options = {}) {
  const maxResults = clampInteger(options?.maxResults, 1, 20, 8)
  const provider = resolveWebSearchProvider(options?.provider)
  if (!provider) {
    throw new Error(
      'No web search provider is configured. Add TAVILY_API_KEY, BRAVE_SEARCH_API_KEY, or SERPAPI_API_KEY.',
    )
  }

  if (provider === 'tavily') return searchWebViaTavily(query, maxResults)
  if (provider === 'brave') return searchWebViaBrave(query, maxResults)
  return searchWebViaSerpApi(query, maxResults)
}

function normalizeRouteProvider(raw) {
  const value = String(raw || 'auto').trim().toLowerCase()
  if (value === 'mapbox' || value === 'google') return value
  return 'auto'
}

function normalizeRouteMode(raw) {
  const value = String(raw || 'driving').trim().toLowerCase()
  if (value === 'walking' || value === 'cycling' || value === 'transit') return value
  return 'driving'
}

function buildGoogleDirectionsUrls(origin, destination, mode) {
  const travelMode = mode === 'cycling' ? 'bicycling' : mode
  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${encodeURIComponent(travelMode)}`
  const embedUrl = `https://www.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&output=embed`
  return { mapUrl, embedUrl }
}

function parseGoogleDurationSeconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.endsWith('s') ? trimmed.slice(0, -1) : trimmed
  const numeric = Number.parseFloat(normalized)
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.round(numeric))
}

async function geocodeMapboxPlace(query) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN)
  url.searchParams.set('limit', '1')
  const payload = await fetchJsonWithTimeout(url.toString())
  const feature = Array.isArray(payload?.features) ? payload.features[0] : null
  if (!feature || !Array.isArray(feature.center) || feature.center.length < 2) {
    throw new Error(`Mapbox geocoding failed for "${query}".`)
  }
  return {
    name: feature.place_name || query,
    lng: Number(feature.center[0]),
    lat: Number(feature.center[1]),
  }
}

async function getRouteViaMapbox(origin, destination, mode) {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured.')
  }
  const profileMap = {
    driving: 'driving',
    walking: 'walking',
    cycling: 'cycling',
    transit: 'driving',
  }
  const profile = profileMap[mode] || 'driving'
  const [start, end] = await Promise.all([
    geocodeMapboxPlace(origin),
    geocodeMapboxPlace(destination),
  ])
  const directionsUrl = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}`,
  )
  directionsUrl.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN)
  directionsUrl.searchParams.set('overview', 'full')
  directionsUrl.searchParams.set('geometries', 'geojson')
  directionsUrl.searchParams.set('steps', 'false')

  const payload = await fetchJsonWithTimeout(directionsUrl.toString())
  const route = Array.isArray(payload?.routes) ? payload.routes[0] : null
  if (!route) {
    throw new Error('Mapbox directions returned no routes.')
  }
  const urls = buildGoogleDirectionsUrls(origin, destination, mode)
  return {
    provider: 'mapbox',
    mode,
    mapUrl: urls.mapUrl,
    embedUrl: urls.embedUrl,
    route: {
      distanceMeters: Number(route.distance) || null,
      durationSeconds: Number(route.duration) || null,
      summary: String(route.legs?.[0]?.summary || `${origin} to ${destination}`).trim(),
      originLabel: start.name,
      destinationLabel: end.name,
    },
  }
}

async function getRouteViaGoogle(origin, destination, mode) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured.')
  }
  const modeMap = {
    driving: 'DRIVE',
    walking: 'WALK',
    cycling: 'BICYCLE',
    transit: 'TRANSIT',
  }
  const googleMode = modeMap[mode] || 'DRIVE'
  const requestBody = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: googleMode,
    computeAlternativeRoutes: false,
    languageCode: 'en-US',
    units: 'METRIC',
    ...(googleMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
  }

  const payload = await fetchJsonWithTimeout('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.duration',
        'routes.description',
        'routes.legs.distanceMeters',
        'routes.legs.duration',
        'fallbackInfo.routingMode',
      ].join(','),
    },
    body: JSON.stringify(requestBody),
  })
  const route = Array.isArray(payload?.routes) ? payload.routes[0] : null
  const leg = Array.isArray(route?.legs) ? route.legs[0] : null
  if (!route) {
    throw new Error('Google Routes API returned no routes.')
  }
  const distanceCandidate = Number(route?.distanceMeters ?? leg?.distanceMeters)
  const distanceMeters = Number.isFinite(distanceCandidate) ? distanceCandidate : null
  const durationSeconds =
    parseGoogleDurationSeconds(route?.duration) ??
    parseGoogleDurationSeconds(leg?.duration) ??
    null
  const urls = buildGoogleDirectionsUrls(origin, destination, mode)
  const fallbackMode = String(payload?.fallbackInfo?.routingMode || '').trim()
  return {
    provider: 'google',
    mode,
    mapUrl: urls.mapUrl,
    embedUrl: urls.embedUrl,
    route: {
      distanceMeters,
      durationSeconds,
      summary: String(route?.description || `${origin} to ${destination}`).trim(),
      originLabel: origin,
      destinationLabel: destination,
    },
    warning: fallbackMode ? `Google routing fallback mode used: ${fallbackMode}.` : undefined,
  }
}

async function getRoutePlan(origin, destination, options = {}) {
  const mode = normalizeRouteMode(options?.mode)
  const provider = normalizeRouteProvider(options?.provider)

  if (provider === 'mapbox') return getRouteViaMapbox(origin, destination, mode)
  if (provider === 'google') return getRouteViaGoogle(origin, destination, mode)

  if (GOOGLE_MAPS_API_KEY) return getRouteViaGoogle(origin, destination, mode)
  if (MAPBOX_ACCESS_TOKEN) return getRouteViaMapbox(origin, destination, mode)

  const urls = buildGoogleDirectionsUrls(origin, destination, mode)
  return {
    provider: 'url-only',
    mode,
    mapUrl: urls.mapUrl,
    embedUrl: urls.embedUrl,
    route: {
      distanceMeters: null,
      durationSeconds: null,
      summary: `${origin} to ${destination}`,
      originLabel: origin,
      destinationLabel: destination,
    },
    warning:
      'No route API key configured. Returning map URLs only. Add MAPBOX_ACCESS_TOKEN or GOOGLE_MAPS_API_KEY.',
  }
}

function normalizeAssetProvider(raw) {
  const value = String(raw || 'auto').trim().toLowerCase()
  if (
    value === 'pexels' ||
    value === 'unsplash' ||
    value === 'giphy' ||
    value === 'pixabay' ||
    value === 'youtube' ||
    value === 'pinterest' ||
    value === 'web'
  ) {
    return value
  }
  return 'auto'
}

function normalizeAssetType(raw) {
  const value = String(raw || 'mixed').trim().toLowerCase()
  if (value === 'image' || value === 'video' || value === 'gif') return value
  return 'mixed'
}

function normalizeAssetResult(item) {
  const url = String(item?.url || '').trim()
  if (!url) return null
  return {
    id: String(item?.id || `${item?.provider || 'asset'}-${Math.random().toString(36).slice(2, 10)}`),
    title: String(item?.title || item?.name || 'Untitled').trim(),
    assetType: String(item?.assetType || 'image'),
    provider: String(item?.provider || 'unknown'),
    url,
    sourcePageUrl: String(item?.sourcePageUrl || url),
    thumbnailUrl: item?.thumbnailUrl ? String(item.thumbnailUrl) : undefined,
    importUrl: item?.importUrl ? String(item.importUrl) : undefined,
    width: Number.isFinite(Number(item?.width)) ? Number(item.width) : undefined,
    height: Number.isFinite(Number(item?.height)) ? Number(item.height) : undefined,
    durationSeconds: Number.isFinite(Number(item?.durationSeconds)) ? Number(item.durationSeconds) : undefined,
    license: item?.license ? String(item.license) : undefined,
    author: item?.author ? String(item.author) : undefined,
  }
}

async function searchAssetsViaPexels(query, type, maxResults) {
  if (!PEXELS_API_KEY) return []
  const endpoint = type === 'video' ? 'https://api.pexels.com/videos/search' : 'https://api.pexels.com/v1/search'
  const params = new URLSearchParams({
    query,
    per_page: String(maxResults),
  })
  const payload = await fetchJsonWithTimeout(`${endpoint}?${params.toString()}`, {
    headers: {
      Authorization: PEXELS_API_KEY,
    },
  })
  if (type === 'video') {
    const rows = Array.isArray(payload?.videos) ? payload.videos : []
    return rows
      .map((item) => {
        const files = Array.isArray(item?.video_files) ? item.video_files : []
        const preferred = files.find((file) => String(file?.file_type || '').includes('mp4')) || files[0]
        return normalizeAssetResult({
          id: item?.id,
          title: item?.url ? `Pexels video ${item.id}` : `Pexels video`,
          provider: 'pexels',
          assetType: 'video',
          url: item?.url,
          sourcePageUrl: item?.url,
          thumbnailUrl: item?.image,
          importUrl: preferred?.link,
          width: item?.width,
          height: item?.height,
          durationSeconds: item?.duration,
          license: 'Pexels License',
          author: item?.user?.name,
        })
      })
      .filter(Boolean)
  }

  const rows = Array.isArray(payload?.photos) ? payload.photos : []
  return rows
    .map((item) =>
      normalizeAssetResult({
        id: item?.id,
        title: item?.alt || `Pexels photo ${item?.id}`,
        provider: 'pexels',
        assetType: 'image',
        url: item?.url,
        sourcePageUrl: item?.url,
        thumbnailUrl: item?.src?.medium || item?.src?.small,
        importUrl: item?.src?.original || item?.src?.large2x || item?.src?.large,
        width: item?.width,
        height: item?.height,
        license: 'Pexels License',
        author: item?.photographer,
      }),
    )
    .filter(Boolean)
}

async function searchAssetsViaUnsplash(query, maxResults) {
  if (!UNSPLASH_ACCESS_KEY) return []
  const params = new URLSearchParams({
    query,
    per_page: String(maxResults),
  })
  const payload = await fetchJsonWithTimeout(`https://api.unsplash.com/search/photos?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      'Accept-Version': 'v1',
    },
  })
  const rows = Array.isArray(payload?.results) ? payload.results : []
  return rows
    .map((item) =>
      normalizeAssetResult({
        id: item?.id,
        title: item?.description || item?.alt_description || `Unsplash photo`,
        provider: 'unsplash',
        assetType: 'image',
        url: item?.links?.html,
        sourcePageUrl: item?.links?.html,
        thumbnailUrl: item?.urls?.small,
        importUrl: item?.urls?.raw || item?.urls?.full,
        width: item?.width,
        height: item?.height,
        license: 'Unsplash License',
        author: item?.user?.name,
      }),
    )
    .filter(Boolean)
}

async function searchAssetsViaGiphy(query, maxResults) {
  if (!GIPHY_API_KEY) return []
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    q: query,
    limit: String(maxResults),
    rating: 'pg',
  })
  const payload = await fetchJsonWithTimeout(`https://api.giphy.com/v1/gifs/search?${params.toString()}`)
  const rows = Array.isArray(payload?.data) ? payload.data : []
  return rows
    .map((item) =>
      normalizeAssetResult({
        id: item?.id,
        title: item?.title || 'Giphy GIF',
        provider: 'giphy',
        assetType: 'gif',
        url: item?.url,
        sourcePageUrl: item?.url,
        thumbnailUrl: item?.images?.fixed_width?.url || item?.images?.preview_gif?.url,
        importUrl: item?.images?.original?.url,
        width: item?.images?.original?.width,
        height: item?.images?.original?.height,
        license: 'GIPHY Terms',
        author: item?.username,
      }),
    )
    .filter(Boolean)
}

async function searchAssetsViaPixabay(query, type, maxResults) {
  if (!PIXABAY_API_KEY) return []
  const isVideo = type === 'video'
  const baseUrl = isVideo ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/'
  const params = new URLSearchParams({
    key: PIXABAY_API_KEY,
    q: query,
    per_page: String(maxResults),
  })
  if (!isVideo) {
    params.set('image_type', 'photo')
    params.set('safesearch', 'true')
  }

  const payload = await fetchJsonWithTimeout(`${baseUrl}?${params.toString()}`)
  const rows = Array.isArray(payload?.hits) ? payload.hits : []
  return rows
    .map((item) => {
      if (isVideo) {
        const video = item?.videos?.medium || item?.videos?.small || item?.videos?.tiny
        return normalizeAssetResult({
          id: item?.id,
          title: item?.tags || `Pixabay video`,
          provider: 'pixabay',
          assetType: 'video',
          url: item?.pageURL,
          sourcePageUrl: item?.pageURL,
          thumbnailUrl: item?.userImageURL || undefined,
          importUrl: video?.url,
          width: video?.width,
          height: video?.height,
          durationSeconds: item?.duration,
          license: 'Pixabay License',
          author: item?.user,
        })
      }

      return normalizeAssetResult({
        id: item?.id,
        title: item?.tags || `Pixabay image`,
        provider: 'pixabay',
        assetType: 'image',
        url: item?.pageURL,
        sourcePageUrl: item?.pageURL,
        thumbnailUrl: item?.previewURL || item?.webformatURL,
        importUrl: item?.largeImageURL || item?.webformatURL,
        width: item?.imageWidth,
        height: item?.imageHeight,
        license: 'Pixabay License',
        author: item?.user,
      })
    })
    .filter(Boolean)
}

async function searchAssetsViaYoutube(query, maxResults) {
  if (!YOUTUBE_API_KEY) return []
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: 'snippet',
    type: 'video',
    maxResults: String(maxResults),
    q: query,
    safeSearch: 'moderate',
  })
  const payload = await fetchJsonWithTimeout(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`)
  const rows = Array.isArray(payload?.items) ? payload.items : []
  return rows
    .map((item) => {
      const videoId = item?.id?.videoId
      if (!videoId) return null
      const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
      return normalizeAssetResult({
        id: videoId,
        title: item?.snippet?.title || 'YouTube video',
        provider: 'youtube',
        assetType: 'video',
        url: watchUrl,
        sourcePageUrl: watchUrl,
        thumbnailUrl:
          item?.snippet?.thumbnails?.high?.url ||
          item?.snippet?.thumbnails?.medium?.url ||
          item?.snippet?.thumbnails?.default?.url,
        importUrl: null,
        license: 'YouTube Terms',
        author: item?.snippet?.channelTitle,
      })
    })
    .filter(Boolean)
}

function inferReferenceProvider(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('pinterest.')) return 'pinterest'
    if (host.includes('dribbble.')) return 'dribbble'
    if (host.includes('behance.')) return 'behance'
    return 'web'
  } catch {
    return 'web'
  }
}

function firstNonEmptyString(values) {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return ''
}

function extractPinterestImageUrl(pin) {
  const direct = firstNonEmptyString([
    pin?.image_original_url,
    pin?.image_url,
    pin?.media?.image_url,
    pin?.media?.cover_image_url,
    pin?.media?.images?.orig?.url,
    pin?.images?.orig?.url,
  ])
  if (direct) return direct

  const pools = [
    pin?.media?.images,
    pin?.images,
    pin?.media_images,
    pin?.image_sizes,
  ]
  for (const pool of pools) {
    if (!pool || typeof pool !== 'object') continue
    const values = Object.values(pool)
    for (const value of values) {
      if (!value || typeof value !== 'object') continue
      const url = firstNonEmptyString([value.url, value.link, value.src])
      if (url) return url
    }
  }
  return ''
}

function normalizePinterestAsset(item) {
  const pinId = firstNonEmptyString([String(item?.id || ''), String(item?.pin_id || '')])
  const sourcePageUrl = firstNonEmptyString([
    item?.link,
    item?.url,
    pinId ? `https://www.pinterest.com/pin/${pinId}/` : '',
  ])
  const imageUrl = extractPinterestImageUrl(item)
  const mediaTypeRaw = firstNonEmptyString([
    item?.media_type,
    item?.media?.media_type,
    item?.pin_media_source?.source_type,
  ]).toLowerCase()

  return normalizeAssetResult({
    id: pinId || undefined,
    title: firstNonEmptyString([item?.title, item?.description, 'Pinterest pin']),
    provider: 'pinterest',
    assetType: mediaTypeRaw.includes('video') ? 'video' : 'image',
    url: sourcePageUrl || imageUrl,
    sourcePageUrl: sourcePageUrl || imageUrl,
    thumbnailUrl: imageUrl || undefined,
    importUrl: imageUrl || undefined,
    width: Number(item?.media?.images?.orig?.width || item?.images?.orig?.width),
    height: Number(item?.media?.images?.orig?.height || item?.images?.orig?.height),
    license: 'Pinterest Terms',
    author: firstNonEmptyString([item?.creator?.username, item?.creator?.id, item?.owner?.username]),
  })
}

async function searchAssetsViaPinterestApi(query, maxResults) {
  if (!PINTEREST_ACCESS_TOKEN) return []

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
  }
  const limit = clampInteger(maxResults, 1, 50, 12)
  const endpoints = []
  if (PINTEREST_ENABLE_PARTNER_SEARCH) {
    const partnerParams = new URLSearchParams({
      term: query,
      country_code: PINTEREST_COUNTRY_CODE,
      locale: PINTEREST_LOCALE,
      limit: String(limit),
    })
    endpoints.push(`https://api.pinterest.com/v5/search/partner/pins?${partnerParams.toString()}`)
  }
  const userParams = new URLSearchParams({
    query,
    page_size: String(limit),
  })
  endpoints.push(`https://api.pinterest.com/v5/search/pins?${userParams.toString()}`)

  let lastError = null
  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJsonWithTimeout(endpoint, { headers })
      const rows = Array.isArray(payload?.items) ? payload.items : []
      const results = rows.map((item) => normalizePinterestAsset(item)).filter(Boolean)
      if (results.length > 0) {
        return results.slice(0, limit)
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) {
    throw lastError
  }
  return []
}

async function searchReferenceAssets(query, maxResults, sites) {
  const siteQuery = sites.map((site) => `site:${site}`).join(' OR ')
  const searchQuery = `${query} (${siteQuery})`
  const web = await searchWeb(searchQuery, { maxResults })
  return (web.results || [])
    .map((item, index) =>
      normalizeAssetResult({
        id: `ref-${index}-${Math.random().toString(36).slice(2, 7)}`,
        title: item.title || item.url,
        provider: inferReferenceProvider(item.url),
        assetType: 'link',
        url: item.url,
        sourcePageUrl: item.url,
        thumbnailUrl: item.thumbnailUrl,
        importUrl: null,
        license: 'Reference only',
      }),
    )
    .filter(Boolean)
}

function uniqueAssetsByUrl(items) {
  const seen = new Set()
  const result = []
  for (const item of items) {
    const key = String(item?.url || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

async function searchAssets(query, options = {}) {
  const type = normalizeAssetType(options?.type)
  const provider = normalizeAssetProvider(options?.provider)
  const maxResults = clampInteger(options?.maxResults, 1, 30, 12)

  const requestedProviders = provider === 'auto'
    ? (() => {
      if (type === 'gif') return ['giphy']
      if (type === 'video') return ['pexels', 'youtube', 'pixabay', 'web']
      if (type === 'image') return ['pexels', 'unsplash', 'pixabay', 'pinterest']
      return ['pexels', 'unsplash', 'giphy', 'pixabay', 'youtube', 'pinterest']
    })()
    : [provider]

  const perProvider = clampInteger(Math.ceil(maxResults / requestedProviders.length) + 1, 2, 15, 6)
  const warnings = []
  const collected = []

  for (const currentProvider of requestedProviders) {
    try {
      if (currentProvider === 'pexels') {
        const pexelsType = type === 'gif' ? 'image' : type === 'mixed' ? 'image' : type
        collected.push(...(await searchAssetsViaPexels(query, pexelsType, perProvider)))
        if (type === 'mixed' && collected.length < maxResults) {
          collected.push(...(await searchAssetsViaPexels(query, 'video', Math.max(2, Math.floor(perProvider / 2)))))
        }
      } else if (currentProvider === 'unsplash') {
        collected.push(...(await searchAssetsViaUnsplash(query, perProvider)))
      } else if (currentProvider === 'giphy') {
        collected.push(...(await searchAssetsViaGiphy(query, perProvider)))
      } else if (currentProvider === 'pixabay') {
        const pixabayType = type === 'video' ? 'video' : 'image'
        collected.push(...(await searchAssetsViaPixabay(query, pixabayType, perProvider)))
      } else if (currentProvider === 'youtube') {
        collected.push(...(await searchAssetsViaYoutube(query, perProvider)))
      } else if (currentProvider === 'pinterest') {
        const pinterestApiResults = await searchAssetsViaPinterestApi(query, perProvider)
        if (pinterestApiResults.length > 0) {
          collected.push(...pinterestApiResults)
        } else {
          collected.push(...(await searchReferenceAssets(query, perProvider, ['pinterest.com', 'dribbble.com', 'behance.net'])))
        }
      } else if (currentProvider === 'web') {
        collected.push(...(await searchReferenceAssets(query, perProvider, ['pinterest.com', 'dribbble.com', 'behance.net', 'vimeo.com'])))
      }
    } catch (error) {
      warnings.push({
        provider: currentProvider,
        error: error instanceof Error ? error.message : 'Provider search failed.',
      })
    }
  }

  const filtered = uniqueAssetsByUrl(collected).slice(0, maxResults)
  if (filtered.length === 0) {
    const warningText = warnings.length > 0
      ? warnings.map((entry) => `${entry.provider}: ${entry.error}`).join(' | ')
      : 'No results.'
    throw new Error(`No assets found. ${warningText}`)
  }

  return {
    provider: provider === 'auto' ? 'multi' : provider,
    type,
    license: String(options?.license || 'any'),
    results: filtered,
    warnings,
  }
}

function inferMediaKindFromMimeType(mimeType, fallbackUrl) {
  const lowerMime = String(mimeType || '').toLowerCase()
  if (lowerMime.includes('gif')) return 'gif'
  if (lowerMime.startsWith('video/')) return 'video'
  const lowerUrl = String(fallbackUrl || '').toLowerCase()
  if (lowerUrl.endsWith('.gif') || lowerUrl.includes('.gif?')) return 'gif'
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/.test(lowerUrl)) return 'video'
  return 'image'
}

function filenameFromRemoteUrl(remoteUrl, fallbackExt) {
  try {
    const parsed = new URL(remoteUrl)
    const baseName = path.basename(parsed.pathname)
    if (baseName && baseName !== '/' && baseName !== '.') return baseName
  } catch {
    // ignore
  }
  const ext = fallbackExt || '.bin'
  return `import-${Date.now()}${ext}`
}

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
    async configureServer(server) {
      const watchedLocalScanProjects = new Map()
      const localScanTimers = new Map()
      const localScanActive = new Set()
      const localScanPending = new Set()
      const canvasAgentStateByProject = new Map()
      const canvasAgentSessionsByProject = new Map()
      const canvasAgentClientsByProject = new Map()
      const canvasAgentPtysBySession = new Map()
      const canvasAgentOutputBySession = new Map()
      const canvasAgentTranscriptBySession = new Map()
      const canvasAgentStateHistoryByProject = new Map()
      const canvasAgentPrimitivesByProject = new Map()
      const canvasAgentQueueActive = new Set()
      const canvasAgentServerRuntimeRoot = path.join(
        CANVAS_AGENT_RUNTIME_ROOT,
        String(process.pid),
        'sessions'
      )

      const getCanvasAgentSessions = (projectId) => {
        if (!canvasAgentSessionsByProject.has(projectId)) {
          canvasAgentSessionsByProject.set(projectId, [])
        }
        return canvasAgentSessionsByProject.get(projectId)
      }

      const getCanvasAgentClients = (projectId) => {
        if (!canvasAgentClientsByProject.has(projectId)) {
          canvasAgentClientsByProject.set(projectId, new Set())
        }
        return canvasAgentClientsByProject.get(projectId)
      }

      const getCanvasAgentTranscript = (sessionId) => {
        if (!canvasAgentTranscriptBySession.has(sessionId)) {
          canvasAgentTranscriptBySession.set(sessionId, [])
        }
        return canvasAgentTranscriptBySession.get(sessionId)
      }

      const getCanvasAgentStateHistory = (projectId) => {
        if (!canvasAgentStateHistoryByProject.has(projectId)) {
          canvasAgentStateHistoryByProject.set(projectId, [])
        }
        return canvasAgentStateHistoryByProject.get(projectId)
      }

      const findCanvasAgentSession = (sessionId) => {
        for (const sessions of canvasAgentSessionsByProject.values()) {
          const session = sessions.find((item) => item.id === sessionId)
          if (session) return session
        }
        return null
      }

      const getCanvasAgentSessionDir = (sessionId) =>
        path.join(canvasAgentServerRuntimeRoot, sessionId)

      const getCanvasAgentSessionFile = (sessionId, filename) =>
        path.join(getCanvasAgentSessionDir(sessionId), filename)

      const ensureCanvasAgentSessionDir = async (sessionId) => {
        const sessionDir = getCanvasAgentSessionDir(sessionId)
        await fs.mkdir(path.join(sessionDir, 'queue'), { recursive: true })
        await fs.mkdir(path.join(sessionDir, 'results'), { recursive: true })
        return sessionDir
      }

      const prepareCanvasAgentSessionLaunch = async (session) => {
        const sessionDir = await ensureCanvasAgentSessionDir(session.id)
        const launch = buildCanvasAgentLaunchMetadata(
          CANVAS_AGENT_DEFINITIONS.find((item) => item.id === session.agentId) || {
            id: session.agentId,
            label: session.agentLabel,
            description: '',
            launchCommand: session.agentCommand || session.launchCommand,
          },
          session,
          sessionDir,
          session.toolCommand || CANVAS_AGENT_TOOL_COMMAND
        )

        if (launch.mcpConfigPath && launch.mcpConfigContent) {
          await fs.writeFile(launch.mcpConfigPath, launch.mcpConfigContent)
        }

        return {
          agentCommand: launch.agentCommand,
          launchCommand: launch.launchCommand,
          mcpServerName: launch.mcpServerName,
          mcpServerCommand: launch.mcpServerCommand,
          mcpConfigPath: launch.mcpConfigPath,
        }
      }

      const broadcastCanvasAgentEvent = (projectId, eventName, payload, excludeClientId) => {
        const clients = getCanvasAgentClients(projectId)
        for (const client of clients) {
          if (excludeClientId && client.id === excludeClientId) continue
          try {
            writeSseEvent(client.res, eventName, payload)
          } catch (error) {
            clients.delete(client)
          }
        }
      }

      const updateCanvasAgentSession = (sessionId, updates) => {
        for (const [projectId, sessions] of canvasAgentSessionsByProject.entries()) {
          const index = sessions.findIndex((item) => item.id === sessionId)
          if (index < 0) continue
          const nextSession = {
            ...sessions[index],
            ...updates,
            updatedAt: new Date().toISOString(),
          }
          sessions[index] = nextSession
          broadcastCanvasAgentEvent(projectId, 'session-updated', {
            session: nextSession,
          })
          void syncCanvasAgentSessionArtifacts(sessionId)
          return nextSession
        }
        return null
      }

      const syncCanvasAgentSessionArtifacts = async (sessionId) => {
        const session = findCanvasAgentSession(sessionId)
        if (!session) return

        await ensureCanvasAgentSessionDir(sessionId)
        const stateRecord = canvasAgentStateByProject.get(session.projectId) || null
        const primitives = canvasAgentPrimitivesByProject.get(session.projectId) || []
        const transcript = getCanvasAgentTranscript(sessionId)
        const stateHistory = getCanvasAgentStateHistory(session.projectId)
        const toolCommand = session.toolCommand || CANVAS_AGENT_TOOL_COMMAND
        const debugPayload = {
          session,
          output: canvasAgentOutputBySession.get(sessionId) || '',
          transcript,
          projectState: stateRecord?.state || null,
          primitives,
          stateHistory,
          toolCommand,
          toolExamples: [
            `${toolCommand} state`,
            `${toolCommand} context`,
            `${toolCommand} primitives`,
            `${toolCommand} create-item ./payload.json`,
            `${toolCommand} update-item item-id ./updates.json`,
            `${toolCommand} transcript`,
          ],
        }

        await Promise.all([
          fs.writeFile(
            getCanvasAgentSessionFile(sessionId, 'context.json'),
            JSON.stringify(
              {
                session,
                toolCommand,
                projectStateUpdatedAt: stateRecord?.updatedAt || null,
                primitiveCount: primitives.length,
              },
              null,
              2
            )
          ),
          fs.writeFile(
            getCanvasAgentSessionFile(sessionId, 'state.json'),
            JSON.stringify(
              {
                state: stateRecord?.state || null,
                updatedAt: stateRecord?.updatedAt || null,
              },
              null,
              2
            )
          ),
          fs.writeFile(
            getCanvasAgentSessionFile(sessionId, 'primitives.json'),
            JSON.stringify(primitives, null, 2)
          ),
          fs.writeFile(
            getCanvasAgentSessionFile(sessionId, 'transcript.json'),
            JSON.stringify(transcript, null, 2)
          ),
          fs.writeFile(
            getCanvasAgentSessionFile(sessionId, 'debug.json'),
            JSON.stringify(debugPayload, null, 2)
          ),
        ])
      }

      const syncCanvasAgentProjectArtifacts = async (projectId) => {
        const sessions = getCanvasAgentSessions(projectId)
        await Promise.all(sessions.map((session) => syncCanvasAgentSessionArtifacts(session.id)))
      }

      const pushCanvasAgentTranscript = (sessionId, kind, text, meta = undefined) => {
        const session = findCanvasAgentSession(sessionId)
        if (!session) return null

        const sanitizedText = sanitizeCanvasAgentTranscriptText(text)
        if (!sanitizedText) return null

        const entry = {
          id: `canvas-agent-transcript-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sessionId,
          at: new Date().toISOString(),
          kind,
          text: sanitizedText,
          meta,
        }
        const transcript = getCanvasAgentTranscript(sessionId)
        transcript.push(entry)
        canvasAgentTranscriptBySession.set(sessionId, trimCanvasAgentTranscript(transcript))
        broadcastCanvasAgentEvent(session.projectId, 'session-transcript', {
          sessionId,
          entry,
        })
        void syncCanvasAgentSessionArtifacts(sessionId)
        return entry
      }

      const pushCanvasAgentStateHistory = (projectId, entry) => {
        const history = getCanvasAgentStateHistory(projectId)
        const previousEntry = history[history.length - 1]
        if (
          previousEntry &&
          previousEntry.source === entry.source &&
          previousEntry.itemCount === entry.itemCount &&
          previousEntry.groupCount === entry.groupCount &&
          previousEntry.operationType === entry.operationType &&
          previousEntry.sessionId === entry.sessionId &&
          previousEntry.toolName === entry.toolName &&
          JSON.stringify(previousEntry.selectedIds) === JSON.stringify(entry.selectedIds)
        ) {
          return previousEntry
        }
        history.push(entry)
        canvasAgentStateHistoryByProject.set(projectId, trimCanvasAgentStateHistory(history))
        return entry
      }

      const upsertCanvasAgentState = (projectId, state, sourceClientId, meta = {}) => {
        const normalizedState = normalizeCanvasStateSnapshot(state)
        const normalizedPrimitives = normalizeCanvasAgentPrimitiveList(meta.primitives)
        const record = {
          projectId,
          state: normalizedState,
          primitives: normalizedPrimitives,
          updatedAt: new Date().toISOString(),
          sourceClientId: sourceClientId || null,
        }
        canvasAgentStateByProject.set(projectId, record)
        canvasAgentPrimitivesByProject.set(projectId, normalizedPrimitives)
        pushCanvasAgentStateHistory(projectId, {
          id: `canvas-agent-state-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: record.updatedAt,
          source:
            typeof meta.source === 'string' && meta.source.trim()
              ? meta.source.trim()
              : sourceClientId
                ? 'canvas-ui'
                : 'system',
          itemCount: normalizedState.items.length,
          groupCount: normalizedState.groups.length,
          selectedIds: normalizedState.selectedIds,
          operationType: meta.operationType || null,
          sessionId: meta.sessionId || null,
          toolName: meta.toolName || null,
        })
        void syncCanvasAgentProjectArtifacts(projectId)
        return record
      }

      const createCanvasAgentSession = async ({ projectId, agentId, cwd, title }) => {
        const definition = CANVAS_AGENT_DEFINITIONS.find((item) => item.id === agentId)
        if (!definition) {
          throw new Error(`Unknown agent: ${agentId}`)
        }
        const now = new Date().toISOString()
        const safeCwd = typeof cwd === 'string' && cwd.trim() ? path.resolve(cwd.trim()) : __dirname
        const session = {
          id: `canvas-agent-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          projectId,
          agentId: definition.id,
          agentLabel: definition.label,
          title:
            typeof title === 'string' && title.trim()
              ? title.trim()
              : `${definition.label} session`,
          cwd: safeCwd,
          agentCommand: definition.launchCommand,
          launchCommand: `cd ${JSON.stringify(safeCwd)} && ${definition.launchCommand}`,
          toolCommand: CANVAS_AGENT_TOOL_COMMAND,
          mcpServerName: CANVAS_MCP_SERVER_NAME,
          mcpServerCommand: `${process.execPath} ${CANVAS_MCP_SERVER_ENTRY}`,
          mcpConfigPath: null,
          startupGuidance: CANVAS_AGENT_MCP_GUIDANCE,
          transport: 'manual-cli',
          status: 'configured',
          createdAt: now,
          updatedAt: now,
          cols: CANVAS_AGENT_DEFAULT_TERMINAL.cols,
          rows: CANVAS_AGENT_DEFAULT_TERMINAL.rows,
          pid: null,
          lastStartedAt: null,
          endedAt: null,
          exitCode: null,
          errorMessage: null,
        }
        const sessions = getCanvasAgentSessions(projectId)
        sessions.unshift(session)
        const launchUpdates = await prepareCanvasAgentSessionLaunch(session)
        Object.assign(session, launchUpdates)
        pushCanvasAgentTranscript(
          session.id,
          'session-created',
          `Created ${definition.label} session.`,
          { agentId: definition.id }
        )
        return session
      }

      const stopCanvasAgentSession = (sessionId, reason = 'stopped') => {
        const ptyProcess = canvasAgentPtysBySession.get(sessionId)
        const session = findCanvasAgentSession(sessionId)
        if (ptyProcess) {
          try {
            ptyProcess.kill()
          } catch (error) {
            console.warn(`[canvas agent] Failed to kill session ${sessionId}:`, error)
          }
          canvasAgentPtysBySession.delete(sessionId)
        }

        const nextSession = updateCanvasAgentSession(sessionId, {
          transport: 'pty',
          status: reason === 'error' ? 'error' : 'stopped',
          endedAt: new Date().toISOString(),
        })
        if (session) {
          pushCanvasAgentTranscript(
            sessionId,
            reason === 'error' ? 'session-error' : 'session-stopped',
            reason === 'error'
              ? `Session stopped with an error.`
              : `Session stopped by request.`,
            { status: nextSession?.status || session.status }
          )
        }
        return nextSession
      }

      const appendCanvasAgentOutput = (session, chunk) => {
        if (!session || typeof chunk !== 'string' || chunk.length === 0) return
        const nextOutput = trimCanvasAgentOutput(
          `${canvasAgentOutputBySession.get(session.id) || ''}${chunk}`
        )
        canvasAgentOutputBySession.set(session.id, nextOutput)
        broadcastCanvasAgentEvent(session.projectId, 'session-output', {
          sessionId: session.id,
          chunk,
        })
        pushCanvasAgentTranscript(session.id, 'output', chunk)
      }

      const startCanvasAgentSession = async (sessionId, dimensions) => {
        const session = findCanvasAgentSession(sessionId)
        if (!session) {
          throw new Error('Canvas agent session not found.')
        }
        if (canvasAgentPtysBySession.has(sessionId)) {
          return session
        }

        const definition = CANVAS_AGENT_DEFINITIONS.find((item) => item.id === session.agentId)
        if (!definition) {
          throw new Error(`Unknown agent: ${session.agentId}`)
        }

        const cols = Math.max(40, Number(dimensions?.cols || session.cols || CANVAS_AGENT_DEFAULT_TERMINAL.cols))
        const rows = Math.max(10, Number(dimensions?.rows || session.rows || CANVAS_AGENT_DEFAULT_TERMINAL.rows))
        const launchUpdates = await prepareCanvasAgentSessionLaunch(session)
        const preparedSession = updateCanvasAgentSession(sessionId, launchUpdates) || {
          ...session,
          ...launchUpdates,
        }
        const spawnConfig = resolveCanvasAgentSpawn(definition, preparedSession)
        const sessionEnv = buildCanvasAgentEnv(spawnConfig.cwd, spawnConfig.shell)
        sessionEnv.CANVAS_AGENT_PROJECT_ID = preparedSession.projectId
        sessionEnv.CANVAS_AGENT_SERVER_URL = resolveCanvasAgentServerUrl(server)
        sessionEnv.CANVAS_AGENT_SESSION_ID = preparedSession.id
        sessionEnv.CANVAS_AGENT_SESSION_DIR = getCanvasAgentSessionDir(preparedSession.id)
        sessionEnv.CANVAS_AGENT_TOOL_COMMAND = preparedSession.toolCommand || CANVAS_AGENT_TOOL_COMMAND

        const ptyProcess = nodePty.spawn(spawnConfig.shell, spawnConfig.args, {
          name: 'xterm-256color',
          cols,
          rows,
          cwd: spawnConfig.cwd,
          env: sessionEnv,
        })

        canvasAgentPtysBySession.set(sessionId, ptyProcess)
        canvasAgentOutputBySession.set(sessionId, '')

        const runningSession = updateCanvasAgentSession(sessionId, {
          transport: 'pty',
          status: 'running',
          pid: ptyProcess.pid,
          cols,
          rows,
          lastStartedAt: new Date().toISOString(),
          endedAt: null,
          exitCode: null,
          errorMessage: null,
        })
        pushCanvasAgentTranscript(
          sessionId,
          'session-started',
          `Started ${definition.label} session at ${cols}x${rows}.`,
          { cols, rows, pid: ptyProcess.pid }
        )

        ptyProcess.onData((data) => {
          appendCanvasAgentOutput(runningSession || session, data)
        })

        ptyProcess.onExit(({ exitCode, signal }) => {
          canvasAgentPtysBySession.delete(sessionId)
          updateCanvasAgentSession(sessionId, {
            status: 'exited',
            endedAt: new Date().toISOString(),
            exitCode: Number.isFinite(exitCode) ? exitCode : null,
            pid: null,
          })
          pushCanvasAgentTranscript(
            sessionId,
            'session-exited',
            `Session exited${Number.isFinite(exitCode) ? ` with code ${exitCode}` : ''}${signal ? ` (${signal})` : ''}.`,
            {
              exitCode: Number.isFinite(exitCode) ? exitCode : null,
              signal: signal || null,
            }
          )
          const message = `\r\n[session exited${Number.isFinite(exitCode) ? `: ${exitCode}` : ''}${signal ? `, signal ${signal}` : ''}]\r\n`
          appendCanvasAgentOutput(runningSession || session, message)
        })

        appendCanvasAgentOutput(runningSession || session, `[starting ${definition.label}]\r\n`)
        appendCanvasAgentOutput(
          runningSession || session,
          `[canvas tool] ${session.toolCommand || CANVAS_AGENT_TOOL_COMMAND} help\r\n`
        )
        return runningSession || session
      }

      const applyCanvasAgentOperation = ({
        projectId,
        operation,
        clientId = null,
        sessionId = null,
        source = 'canvas-operation',
        toolName = null,
      }) => {
        const currentRecord =
          canvasAgentStateByProject.get(projectId) ||
          upsertCanvasAgentState(projectId, { items: [], groups: [], nextZIndex: 1, selectedIds: [] }, null)
        const nextState = applyCanvasRemoteOperationToState(currentRecord.state, operation)
        const updatedRecord = upsertCanvasAgentState(projectId, nextState, clientId, {
          source,
          operationType: operation?.type || null,
          sessionId,
          toolName,
        })

        if (sessionId) {
          pushCanvasAgentTranscript(
            sessionId,
            toolName ? 'tool-call' : 'canvas-operation',
            toolName
              ? `${toolName} applied ${operation?.type || 'operation'}.`
              : `Applied ${operation?.type || 'operation'}.`,
            {
              operationType: operation?.type || null,
              toolName: toolName || null,
            }
          )
        }

        broadcastCanvasAgentEvent(
          projectId,
          'canvas-operation',
          {
            operation,
            sourceClientId: clientId || null,
            sessionId,
            source,
            toolName,
            updatedAt: updatedRecord.updatedAt,
          },
          clientId || undefined
        )

        return updatedRecord
      }

      const processCanvasAgentQueueFile = async (filePath) => {
        const normalizedPath = path.resolve(filePath)
        const requestRaw = await fs.readFile(normalizedPath, 'utf8')
        const request = JSON.parse(requestRaw)
        const derivedSessionId = path.basename(path.dirname(path.dirname(normalizedPath)))
        const sessionId =
          typeof request.sessionId === 'string' && request.sessionId.trim()
            ? request.sessionId.trim()
            : derivedSessionId
        const session = findCanvasAgentSession(sessionId)
        if (!session) {
          throw new Error(`Canvas agent session not found for queue file ${normalizedPath}`)
        }

        const updatedRecord = applyCanvasAgentOperation({
          projectId: session.projectId,
          operation: request.operation,
          sessionId,
          source:
            typeof request.source === 'string' && request.source.trim()
              ? request.source.trim()
              : 'canvas-agent-cli',
          toolName:
            typeof request.toolName === 'string' && request.toolName.trim()
              ? request.toolName.trim()
              : null,
        })

        const resultPath = getCanvasAgentSessionFile(
          sessionId,
          path.join('results', `${request.id || path.basename(normalizedPath, '.json')}.json`)
        )
        await fs.writeFile(
          resultPath,
          JSON.stringify(
            {
              ok: true,
              updatedAt: updatedRecord.updatedAt,
              state: updatedRecord.state,
            },
            null,
            2
          )
        )
        await fs.unlink(normalizedPath).catch(() => {})
      }

      const handleCanvasAgentQueueEvent = (filePath) => {
        const normalizedPath = path.resolve(filePath)
        if (!normalizedPath.startsWith(canvasAgentServerRuntimeRoot)) return
        if (!normalizedPath.endsWith('.json')) return
        if (!normalizedPath.includes(`${path.sep}queue${path.sep}`)) return
        if (canvasAgentQueueActive.has(normalizedPath)) return

        canvasAgentQueueActive.add(normalizedPath)
        void (async () => {
          try {
            await new Promise((resolve) => setTimeout(resolve, 25))
            await processCanvasAgentQueueFile(normalizedPath)
          } catch (error) {
            const sessionId = path.basename(path.dirname(path.dirname(normalizedPath)))
            pushCanvasAgentTranscript(
              sessionId,
              'session-error',
              error?.message || 'Failed to process canvas agent queue item.'
            )
            const resultPath = getCanvasAgentSessionFile(
              sessionId,
              path.join('results', `${path.basename(normalizedPath, '.json')}.json`)
            )
            await ensureCanvasAgentSessionDir(sessionId).catch(() => {})
            await fs.writeFile(
              resultPath,
              JSON.stringify(
                {
                  ok: false,
                  error: error?.message || 'Failed to process canvas agent queue item.',
                },
                null,
                2
              )
            ).catch(() => {})
          } finally {
            canvasAgentQueueActive.delete(normalizedPath)
          }
        })()
      }

      const registerLocalScanProject = (project) => {
        if (!project?.projectId || !project?.repoPath) return
        const normalizedRepoPath = path.resolve(project.repoPath)
        const existing = watchedLocalScanProjects.get(project.projectId)
        watchedLocalScanProjects.set(project.projectId, {
          ...project,
          repoPath: normalizedRepoPath,
        })
        if (!existing || existing.repoPath !== normalizedRepoPath) {
          server.watcher.add(normalizedRepoPath)
        }
      }

      const runLocalScan = async (projectId, reason) => {
        const project = watchedLocalScanProjects.get(projectId)
        if (!project) return
        localScanActive.add(projectId)

        try {
          const result = await syncLocalScanProject({
            repoPath: project.repoPath,
            projectId: project.projectId,
            projectLabel: project.label,
          })

          registerLocalScanProject({
            ...project,
            label: result.projectLabel,
            repoPath: result.repoPath,
          })

          if (result.changed) {
            console.info(`[local scan] synced ${projectId} (${reason})`)
            server.ws.send({ type: 'full-reload', path: '*' })
          }
        } catch (error) {
          console.warn(`[local scan] Failed to sync ${projectId}:`, error)
        } finally {
          localScanActive.delete(projectId)
          if (localScanPending.has(projectId)) {
            localScanPending.delete(projectId)
            scheduleLocalScan(projectId, 'follow-up')
          }
        }
      }

      const scheduleLocalScan = (projectId, reason = 'watch') => {
        if (!LOCAL_SCAN_AUTO_SYNC || !watchedLocalScanProjects.has(projectId)) return
        const existingTimer = localScanTimers.get(projectId)
        if (existingTimer) clearTimeout(existingTimer)

        const timer = setTimeout(() => {
          localScanTimers.delete(projectId)
          if (localScanActive.has(projectId)) {
            localScanPending.add(projectId)
            return
          }
          void runLocalScan(projectId, reason)
        }, LOCAL_SCAN_WATCH_DEBOUNCE_MS)

        localScanTimers.set(projectId, timer)
      }

      const handleLocalScanEvent = (filePath) => {
        if (!LOCAL_SCAN_AUTO_SYNC) return
        const normalizedPath = path.resolve(filePath)
        if (!shouldHandleLocalScanPath(normalizedPath)) return

        for (const project of watchedLocalScanProjects.values()) {
          if (!isSubPath(project.repoPath, normalizedPath)) continue
          scheduleLocalScan(project.projectId, 'watch')
        }
      }

      server.watcher.on('add', handleLocalScanEvent)
      server.watcher.on('change', handleLocalScanEvent)
      server.watcher.on('unlink', handleLocalScanEvent)
      await fs.mkdir(canvasAgentServerRuntimeRoot, { recursive: true })
      server.watcher.add(canvasAgentServerRuntimeRoot)
      server.watcher.on('add', handleCanvasAgentQueueEvent)
      server.watcher.on('change', handleCanvasAgentQueueEvent)

      server.httpServer?.once('close', () => {
        for (const sessionId of canvasAgentPtysBySession.keys()) {
          stopCanvasAgentSession(sessionId)
        }
      })

      if (LOCAL_SCAN_AUTO_SYNC) {
        const autoScanProjects = await listLocalScanProjects()
        for (const project of autoScanProjects) {
          registerLocalScanProject(project)
        }
        for (const project of autoScanProjects) {
          await runLocalScan(project.projectId, 'startup')
        }
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()
        const pathname = req.url.split('?')[0]

        if (req.method === 'GET' && pathname === '/api/canvas-agent/agents') {
          return sendJson(res, 200, {
            ok: true,
            agents: CANVAS_AGENT_DEFINITIONS,
          })
        }

        if (req.method === 'GET' && pathname === '/api/canvas-agent/sessions') {
          const requestUrl = new URL(req.url, 'http://localhost')
          const projectId = requestUrl.searchParams.get('projectId')?.trim()
          if (!projectId) {
            return sendJson(res, 400, { error: 'projectId query param is required.' })
          }

          return sendJson(res, 200, {
            ok: true,
            sessions: getCanvasAgentSessions(projectId),
          })
        }

        if (req.method === 'POST' && pathname === '/api/canvas-agent/sessions') {
          try {
            const body = await readJson(req)
            const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
            const agentId = typeof body.agentId === 'string' ? body.agentId.trim() : ''

            if (!projectId || !agentId) {
              return sendJson(res, 400, { error: 'projectId and agentId are required.' })
            }

            const session = await createCanvasAgentSession({
              projectId,
              agentId,
              cwd: body.cwd,
              title: body.title,
            })

            broadcastCanvasAgentEvent(projectId, 'session-created', { session })
            return sendJson(res, 200, { ok: true, session })
          } catch (error) {
            return sendJson(res, 400, {
              error: error?.message || 'Failed to create canvas agent session.',
            })
          }
        }

        const canvasAgentSessionOutputMatch = pathname.match(/^\/api\/canvas-agent\/sessions\/([^/]+)\/output$/)
        if (req.method === 'GET' && canvasAgentSessionOutputMatch) {
          const sessionId = decodeURIComponent(canvasAgentSessionOutputMatch[1])
          const session = findCanvasAgentSession(sessionId)
          if (!session) {
            return sendJson(res, 404, { error: 'Canvas agent session not found.' })
          }

          return sendJson(res, 200, {
            ok: true,
            session,
            output: canvasAgentOutputBySession.get(sessionId) || '',
          })
        }

        const canvasAgentSessionDebugMatch = pathname.match(/^\/api\/canvas-agent\/sessions\/([^/]+)\/debug$/)
        if (req.method === 'GET' && canvasAgentSessionDebugMatch) {
          const sessionId = decodeURIComponent(canvasAgentSessionDebugMatch[1])
          const session = findCanvasAgentSession(sessionId)
          if (!session) {
            return sendJson(res, 404, { error: 'Canvas agent session not found.' })
          }

          const stateRecord = canvasAgentStateByProject.get(session.projectId) || null
          const primitives = canvasAgentPrimitivesByProject.get(session.projectId) || []
          const toolCommand = session.toolCommand || CANVAS_AGENT_TOOL_COMMAND
          return sendJson(res, 200, {
            ok: true,
            debug: {
              session,
              output: canvasAgentOutputBySession.get(sessionId) || '',
              transcript: getCanvasAgentTranscript(sessionId),
              projectState: stateRecord?.state || null,
              primitives,
              stateHistory: getCanvasAgentStateHistory(session.projectId),
              toolCommand,
              toolExamples: [
                `${toolCommand} state`,
                `${toolCommand} context`,
                `${toolCommand} primitives`,
                `${toolCommand} create-item ./payload.json`,
                `${toolCommand} update-item item-id ./updates.json`,
                `${toolCommand} transcript`,
              ],
            },
          })
        }

        const canvasAgentSessionActionMatch = pathname.match(
          /^\/api\/canvas-agent\/sessions\/([^/]+)\/(start|stop|input|resize)$/
        )
        if (req.method === 'POST' && canvasAgentSessionActionMatch) {
          try {
            const sessionId = decodeURIComponent(canvasAgentSessionActionMatch[1])
            const action = canvasAgentSessionActionMatch[2]
            const session = findCanvasAgentSession(sessionId)
            if (!session) {
              return sendJson(res, 404, { error: 'Canvas agent session not found.' })
            }

            const body = await readJson(req)

            if (action === 'start') {
              try {
                const startedSession = await startCanvasAgentSession(sessionId, body)
                return sendJson(res, 200, {
                  ok: true,
                  session: startedSession,
                })
              } catch (error) {
                pushCanvasAgentTranscript(
                  sessionId,
                  'session-error',
                  error?.message || 'Failed to start agent session.'
                )
                const failedSession = updateCanvasAgentSession(sessionId, {
                  transport: 'pty',
                  status: 'error',
                  errorMessage: error?.message || 'Failed to start agent session.',
                  endedAt: new Date().toISOString(),
                })
                return sendJson(res, 500, {
                  error: error?.message || 'Failed to start agent session.',
                  session: failedSession,
                })
              }
            }

            if (action === 'stop') {
              const stoppedSession = stopCanvasAgentSession(sessionId)
              return sendJson(res, 200, {
                ok: true,
                session: stoppedSession,
              })
            }

            const ptyProcess = canvasAgentPtysBySession.get(sessionId)
            if (!ptyProcess) {
              return sendJson(res, 409, { error: 'Canvas agent session is not running.' })
            }

            if (action === 'input') {
              const input = typeof body.input === 'string' ? body.input : ''
              if (!input) {
                return sendJson(res, 400, { error: 'input is required.' })
              }
              ptyProcess.write(input)
              return sendJson(res, 200, { ok: true })
            }

            if (action === 'resize') {
              const cols = Math.max(40, Number(body.cols || session.cols || CANVAS_AGENT_DEFAULT_TERMINAL.cols))
              const rows = Math.max(10, Number(body.rows || session.rows || CANVAS_AGENT_DEFAULT_TERMINAL.rows))
              ptyProcess.resize(cols, rows)
              const resizedSession = updateCanvasAgentSession(sessionId, { cols, rows })
              return sendJson(res, 200, {
                ok: true,
                session: resizedSession,
              })
            }
          } catch (error) {
            return sendJson(res, 500, {
              error: error?.message || 'Failed to update canvas agent session.',
            })
          }
        }

        if (req.method === 'GET' && pathname === '/api/canvas-agent/state') {
          const requestUrl = new URL(req.url, 'http://localhost')
          const projectId = requestUrl.searchParams.get('projectId')?.trim()
          if (!projectId) {
            return sendJson(res, 400, { error: 'projectId query param is required.' })
          }

          const stateRecord = canvasAgentStateByProject.get(projectId) || null
          return sendJson(res, 200, {
            ok: true,
            state: stateRecord?.state || null,
            primitives: stateRecord?.primitives || [],
            updatedAt: stateRecord?.updatedAt || null,
            sourceClientId: stateRecord?.sourceClientId || null,
          })
        }

        if (req.method === 'POST' && pathname === '/api/canvas-agent/state') {
          try {
            const body = await readJson(req)
            const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
            if (!projectId) {
              return sendJson(res, 400, { error: 'projectId is required.' })
            }

            const stateRecord = upsertCanvasAgentState(projectId, body.state, body.clientId, {
              source:
                typeof body.source === 'string' && body.source.trim()
                  ? body.source.trim()
                  : 'canvas-ui',
              primitives: body.primitives,
              sessionId:
                typeof body.sessionId === 'string' && body.sessionId.trim()
                  ? body.sessionId.trim()
                  : null,
              toolName:
                typeof body.toolName === 'string' && body.toolName.trim()
                  ? body.toolName.trim()
                  : null,
            })
            return sendJson(res, 200, {
              ok: true,
              primitives: stateRecord.primitives,
              updatedAt: stateRecord.updatedAt,
            })
          } catch (error) {
            return sendJson(res, 400, {
              error: error?.message || 'Failed to sync canvas state.',
            })
          }
        }

        if (req.method === 'POST' && pathname === '/api/canvas-agent/operations') {
          try {
            const body = await readJson(req)
            const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
            const sessionId =
              typeof body.sessionId === 'string' && body.sessionId.trim() ? body.sessionId.trim() : null
            const toolName =
              typeof body.toolName === 'string' && body.toolName.trim() ? body.toolName.trim() : null
            const source =
              typeof body.source === 'string' && body.source.trim()
                ? body.source.trim()
                : toolName
                  ? `canvas-tool:${toolName}`
                  : 'canvas-operation'
            if (!projectId) {
              return sendJson(res, 400, { error: 'projectId is required.' })
            }

            const updatedRecord = applyCanvasAgentOperation({
              projectId,
              operation: body.operation,
              clientId: body.clientId || null,
              sessionId,
              source,
              toolName,
            })

            return sendJson(res, 200, {
              ok: true,
              updatedAt: updatedRecord.updatedAt,
              state: updatedRecord.state,
            })
          } catch (error) {
            return sendJson(res, 400, {
              error: error?.message || 'Failed to apply canvas operation.',
            })
          }
        }

        if (req.method === 'GET' && pathname === '/api/canvas-agent/events') {
          const requestUrl = new URL(req.url, 'http://localhost')
          const projectId = requestUrl.searchParams.get('projectId')?.trim()
          const clientId =
            requestUrl.searchParams.get('clientId')?.trim() ||
            `canvas-agent-client-${Math.random().toString(36).slice(2, 8)}`

          if (!projectId) {
            return sendJson(res, 400, { error: 'projectId query param is required.' })
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache, no-transform')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('X-Accel-Buffering', 'no')
          res.flushHeaders?.()

          const client = {
            id: clientId,
            res,
          }
          const clients = getCanvasAgentClients(projectId)
          clients.add(client)

          writeSseEvent(res, 'hello', {
            clientId,
            projectId,
            connectedAt: new Date().toISOString(),
          })

          const pingTimer = setInterval(() => {
            writeSseEvent(res, 'ping', { at: new Date().toISOString() })
          }, 15000)
          let cleanedUp = false

          const cleanup = () => {
            if (cleanedUp) return
            cleanedUp = true
            clearInterval(pingTimer)
            clients.delete(client)
            res.end()
          }

          req.on('close', cleanup)
          req.on('end', cleanup)
          return
        }

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

        if (req.method === 'POST' && pathname === '/api/agent/search-web') {
          try {
            const body = await readJson(req)
            const query = typeof body.query === 'string' ? body.query.trim() : ''
            if (!query) {
              return sendJson(res, 400, { error: 'query is required.' })
            }
            const results = await searchWeb(query, {
              provider: body.provider,
              maxResults: body.maxResults,
            })
            return sendJson(res, 200, {
              ok: true,
              query,
              provider: results.provider,
              results: results.results,
              fetchedAt: new Date().toISOString(),
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to search web.' })
          }
        }

        if (req.method === 'POST' && pathname === '/api/agent/get-route') {
          try {
            const body = await readJson(req)
            const origin = typeof body.origin === 'string' ? body.origin.trim() : ''
            const destination = typeof body.destination === 'string' ? body.destination.trim() : ''
            if (!origin || !destination) {
              return sendJson(res, 400, { error: 'origin and destination are required.' })
            }
            const route = await getRoutePlan(origin, destination, {
              mode: body.mode,
              provider: body.provider,
            })
            return sendJson(res, 200, {
              ok: true,
              origin,
              destination,
              provider: route.provider,
              mode: route.mode,
              mapUrl: route.mapUrl,
              embedUrl: route.embedUrl,
              route: route.route,
              warning: route.warning,
              fetchedAt: new Date().toISOString(),
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to get route.' })
          }
        }

        if (req.method === 'POST' && pathname === '/api/agent/search-assets') {
          try {
            const body = await readJson(req)
            const query = typeof body.query === 'string' ? body.query.trim() : ''
            if (!query) {
              return sendJson(res, 400, { error: 'query is required.' })
            }
            const results = await searchAssets(query, {
              type: body.type,
              license: body.license,
              provider: body.provider,
              maxResults: body.maxResults,
            })
            return sendJson(res, 200, {
              ok: true,
              query,
              provider: results.provider,
              type: results.type,
              license: results.license,
              results: results.results,
              warnings: results.warnings,
              fetchedAt: new Date().toISOString(),
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to search assets.' })
          }
        }

        if (req.method === 'POST' && pathname === '/api/agent/import-asset') {
          try {
            const body = await readJson(req)
            const assetUrl = typeof body.url === 'string' ? body.url.trim() : ''
            if (!assetUrl) {
              return sendJson(res, 400, { error: 'url is required.' })
            }
            const preferredFilename =
              typeof body.filename === 'string' && body.filename.trim() ? body.filename.trim() : undefined
            const imported = await importAssetFromRemoteUrl(assetUrl, preferredFilename)
            const mediaKind =
              typeof body.mediaKind === 'string' && ['image', 'video', 'gif'].includes(body.mediaKind)
                ? body.mediaKind
                : imported.mediaKind

            return sendJson(res, 200, {
              ok: true,
              url: assetUrl,
              mediaUrl: imported.mediaUrl,
              fileName: imported.fileName,
              mimeType: imported.mimeType,
              sizeBytes: imported.sizeBytes,
              provider: 'remote-import',
              storedAt: imported.storedAt,
              mediaKind,
            })
          } catch (error) {
            return sendJson(res, 502, { error: error?.message || 'Failed to import remote asset.' })
          }
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

        if (req.method === 'POST' && pathname === '/api/projects/scan-local') {
          try {
            const body = await readJson(req)
            const repoPathRaw = typeof body.repoPath === 'string' ? body.repoPath.trim() : ''
            if (!repoPathRaw) {
              return sendJson(res, 400, { error: 'repoPath is required.' })
            }
            const projectId = slugify(
              typeof body.projectId === 'string' && body.projectId.trim()
                ? body.projectId.trim()
                : path.basename(repoPathRaw)
            )
            const projectLabel =
              typeof body.label === 'string' && body.label.trim()
                ? body.label.trim()
                : path.basename(repoPathRaw)
            const dryRun = body.dryRun === true

            if (dryRun) {
              const repoPath = path.resolve(repoPathRaw)
              assertLocalScanPathAllowed(repoPath)
              const files = await collectLocalComponentCandidates(repoPath)
              const candidates = []
              for (const filePath of files) {
                const source = await fs.readFile(filePath, 'utf8').catch(() => '')
                if (!source || !source.includes('export')) continue
                const exports = extractReactComponentExports(source, filePath)
                if (exports.length === 0) continue
                const relativePath = path.relative(repoPath, filePath).replace(/\\/g, '/')
                exports.forEach((item) => {
                  if (candidates.length >= LOCAL_SCAN_MAX_COMPONENTS) return
                  candidates.push({
                    componentName: item.componentName,
                    exportName: item.exportName,
                    relativePath,
                  })
                })
                if (candidates.length >= LOCAL_SCAN_MAX_COMPONENTS) break
              }

              return sendJson(res, 200, {
                ok: true,
                dryRun: true,
                repoPath,
                projectId,
                scannedFiles: files.length,
                detectedCount: candidates.length,
                candidates: candidates.slice(0, 50),
              })
            }
            const result = await syncLocalScanProject({
              repoPath: repoPathRaw,
              projectId,
              projectLabel,
            })
            registerLocalScanProject({
              projectId: result.projectId,
              label: result.projectLabel,
              repoPath: result.repoPath,
            })

            return sendJson(res, 200, {
              ...result,
              reload: result.changed,
            })
          } catch (error) {
            return sendJson(res, 500, { error: error?.message || 'Failed to scan local repository.' })
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
              coreImportPath: '@/core',
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
      allow: Array.from(new Set(LOCAL_SCAN_ALLOWED_ROOTS)),
    },
  },
  root: 'demo',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
