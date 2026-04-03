import { readFileSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_SERVER_URL = 'http://127.0.0.1:5173'

export function buildDefaultSystemCanvasWorkspaceKey(projectId) {
  const normalizedProjectId = typeof projectId === 'string' && projectId.trim() ? projectId.trim() : 'demo'
  return `gallery-${normalizedProjectId}:system-canvas`
}

export function buildDefaultColorAuditWorkspaceKey(projectId) {
  const normalizedProjectId = typeof projectId === 'string' && projectId.trim() ? projectId.trim() : 'demo'
  return `gallery-${normalizedProjectId}:color-audit`
}

export function buildDefaultNodeCatalogWorkspaceKey(projectId) {
  const normalizedProjectId = typeof projectId === 'string' && projectId.trim() ? projectId.trim() : 'demo'
  return `gallery-${normalizedProjectId}-node-catalog`
}

export function getDefaultCanvasAgentServerUrl() {
  return process.env.CANVAS_AGENT_SERVER_URL?.trim() || DEFAULT_SERVER_URL
}

export function resolveCanvasAgentContextFilePath(cwd = process.cwd()) {
  return path.resolve(cwd, '.canvas-agent', 'attached-session.json')
}

export async function readCanvasAgentAttachedContext(filePath = resolveCanvasAgentContextFilePath()) {
  const payload = await readJsonFile(filePath)
  if (!payload || typeof payload !== 'object') {
    fail(`Invalid attached canvas-agent context at ${filePath}`)
  }
  return payload
}

export async function writeCanvasAgentAttachedContext(
  payload,
  filePath = resolveCanvasAgentContextFilePath()
) {
  if (!payload || typeof payload !== 'object') {
    fail('Attached canvas-agent context payload is required.')
  }
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(payload, null, 2))
  return filePath
}

export async function clearCanvasAgentAttachedContext(filePath = resolveCanvasAgentContextFilePath()) {
  await rm(filePath, { force: true })
}

export function getCanvasAgentContextFromEnv() {
  const sessionDir = process.env.CANVAS_AGENT_SESSION_DIR?.trim()
  const projectId = process.env.CANVAS_AGENT_PROJECT_ID?.trim()
  const sessionId = process.env.CANVAS_AGENT_SESSION_ID?.trim()

  if (sessionDir && projectId && sessionId) {
    return {
      sessionDir,
      projectId,
      sessionId,
      serverUrl: getDefaultCanvasAgentServerUrl(),
      colorAuditWorkspaceKey:
        process.env.CANVAS_AGENT_COLOR_AUDIT_WORKSPACE_KEY?.trim() ||
        buildDefaultColorAuditWorkspaceKey(projectId),
      systemCanvasWorkspaceKey:
        process.env.CANVAS_AGENT_SYSTEM_CANVAS_WORKSPACE_KEY?.trim() ||
        buildDefaultSystemCanvasWorkspaceKey(projectId),
      nodeCatalogWorkspaceKey:
        process.env.CANVAS_AGENT_NODE_CATALOG_WORKSPACE_KEY?.trim() ||
        buildDefaultNodeCatalogWorkspaceKey(projectId),
    }
  }

  const contextFilePath =
    process.env.CANVAS_AGENT_CONTEXT_FILE?.trim() || resolveCanvasAgentContextFilePath()

  try {
    const attached = JSON.parse(readFileSync(contextFilePath, 'utf8'))
    if (!attached?.sessionDir) fail(`Attached canvas-agent context is missing sessionDir: ${contextFilePath}`)
    if (!attached?.projectId) fail(`Attached canvas-agent context is missing projectId: ${contextFilePath}`)
    if (!attached?.sessionId) fail(`Attached canvas-agent context is missing sessionId: ${contextFilePath}`)
    return {
      sessionDir: attached.sessionDir,
      projectId: attached.projectId,
      sessionId: attached.sessionId,
      serverUrl:
        process.env.CANVAS_AGENT_SERVER_URL?.trim() ||
        attached.serverUrl ||
        getDefaultCanvasAgentServerUrl(),
      colorAuditWorkspaceKey:
        process.env.CANVAS_AGENT_COLOR_AUDIT_WORKSPACE_KEY?.trim() ||
        attached.colorAuditWorkspaceKey ||
        buildDefaultColorAuditWorkspaceKey(attached.projectId),
      systemCanvasWorkspaceKey:
        process.env.CANVAS_AGENT_SYSTEM_CANVAS_WORKSPACE_KEY?.trim() ||
        attached.systemCanvasWorkspaceKey ||
        buildDefaultSystemCanvasWorkspaceKey(attached.projectId),
      nodeCatalogWorkspaceKey:
        process.env.CANVAS_AGENT_NODE_CATALOG_WORKSPACE_KEY?.trim() ||
        attached.nodeCatalogWorkspaceKey ||
        buildDefaultNodeCatalogWorkspaceKey(attached.projectId),
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      fail(
        `Canvas agent context is not configured. Run "bin/canvas-agent attach --project <project-id>" first, or set CANVAS_AGENT_SESSION_DIR / CANVAS_AGENT_PROJECT_ID / CANVAS_AGENT_SESSION_ID.`
      )
    }
    throw error
  }
}

export async function bootstrapCanvasAgentSession({
  projectId,
  agentId = 'codex',
  cwd,
  title,
  serverUrl = getDefaultCanvasAgentServerUrl(),
  surfaceId,
  reuseSession = true,
}) {
  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
    fail('bootstrapCanvasAgentSession requires projectId.')
  }

  const response = await fetch(new URL('/api/canvas-agent/bootstrap', serverUrl).toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      projectId: projectId.trim(),
      agentId: typeof agentId === 'string' && agentId.trim() ? agentId.trim() : 'codex',
      cwd: typeof cwd === 'string' && cwd.trim() ? cwd.trim() : undefined,
      title: typeof title === 'string' && title.trim() ? title.trim() : undefined,
      surfaceId: typeof surfaceId === 'string' && surfaceId.trim() ? surfaceId.trim() : undefined,
      reuseSession: reuseSession !== false,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    fail(
      typeof data?.error === 'string'
        ? data.error
        : `Canvas agent bootstrap failed (${response.status}).`
    )
  }

  const payload = await response.json()
  return payload?.bootstrap ?? null
}

export function formatCanvasAgentShellExports(context) {
  if (!context || typeof context !== 'object') fail('Canvas agent context is required.')
  const lines = [
    `export CANVAS_AGENT_SERVER_URL=${JSON.stringify(context.serverUrl || getDefaultCanvasAgentServerUrl())}`,
    `export CANVAS_AGENT_PROJECT_ID=${JSON.stringify(context.projectId)}`,
    `export CANVAS_AGENT_SESSION_ID=${JSON.stringify(context.sessionId)}`,
    `export CANVAS_AGENT_SESSION_DIR=${JSON.stringify(context.sessionDir)}`,
  ]

  if (context.colorAuditWorkspaceKey) {
    lines.push(
      `export CANVAS_AGENT_COLOR_AUDIT_WORKSPACE_KEY=${JSON.stringify(context.colorAuditWorkspaceKey)}`
    )
  }
  if (context.systemCanvasWorkspaceKey) {
    lines.push(
      `export CANVAS_AGENT_SYSTEM_CANVAS_WORKSPACE_KEY=${JSON.stringify(
        context.systemCanvasWorkspaceKey
      )}`
    )
  }
  if (context.nodeCatalogWorkspaceKey) {
    lines.push(
      `export CANVAS_AGENT_NODE_CATALOG_WORKSPACE_KEY=${JSON.stringify(
        context.nodeCatalogWorkspaceKey
      )}`
    )
  }

  return lines.join('\n')
}

export async function readCanvasAgentStateEnvelope(context) {
  return readJsonFile(path.join(context.sessionDir, 'state.json'))
}

export async function readCanvasAgentState(context) {
  const envelope = await readCanvasAgentStateEnvelope(context)
  return envelope?.state ?? null
}

export async function readCanvasAgentSelection(context) {
  const state = await readCanvasAgentState(context)
  return Array.isArray(state?.selectedIds) ? state.selectedIds : []
}

export async function readCanvasAgentPrimitives(context) {
  const primitives = await readJsonFile(path.join(context.sessionDir, 'primitives.json')).catch(() => [])
  return Array.isArray(primitives) ? primitives : []
}

export async function readCanvasAgentContextFile(context) {
  return readJsonFile(path.join(context.sessionDir, 'context.json'))
}

export async function readCanvasAgentTranscript(context) {
  return readJsonFile(path.join(context.sessionDir, 'transcript.json'))
}

export async function readCanvasAgentDebug(context) {
  return readJsonFile(path.join(context.sessionDir, 'debug.json'))
}

function buildAgentNativeUrl(context, pathname, searchParams = {}) {
  const url = new URL(pathname, context.serverUrl)
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      url.searchParams.set(key, value.trim())
    }
  })
  return url.toString()
}

async function readAgentNativeJson(context, pathname, searchParams = {}) {
  const url = buildAgentNativeUrl(context, pathname, searchParams)
  const response = await fetch(url)
  if (!response.ok) {
    fail(`Agent-native request failed (${response.status}) for ${url}`)
  }
  return response.json()
}

async function postAgentNativeJson(context, pathname, body) {
  const url = buildAgentNativeUrl(context, pathname)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    fail(`Agent-native request failed (${response.status}) for ${url}`)
  }
  return response.json()
}

export async function readAgentNativeManifest(context) {
  const payload = await readAgentNativeJson(context, '/api/agent-native/manifest')
  return payload?.manifest ?? null
}

export async function readAgentNativeWorkspaceManifest(context, workspaceId, workspaceKey) {
  const payload = await readAgentNativeJson(
    context,
    `/api/agent-native/workspaces/${encodeURIComponent(workspaceId)}/manifest`,
    {
      workspaceKey: workspaceKey || '',
    }
  )
  return payload?.manifest ?? null
}

export async function readAgentNativeWorkspaceState(context, workspaceId, workspaceKey) {
  const payload = await readAgentNativeJson(
    context,
    `/api/agent-native/workspaces/${encodeURIComponent(workspaceId)}/state`,
    {
      workspaceKey: workspaceKey || '',
    }
  )
  return payload?.state ?? null
}

export async function readAgentNativeWorkspaceEvents(
  context,
  workspaceId,
  workspaceKey,
  options = {}
) {
  const payload = await readAgentNativeJson(
    context,
    `/api/agent-native/workspaces/${encodeURIComponent(workspaceId)}/events`,
    {
      workspaceKey: workspaceKey || '',
      cursor:
        Number.isFinite(options.cursor) && Number(options.cursor) > 0
          ? String(Number(options.cursor))
          : '',
      limit:
        Number.isFinite(options.limit) && Number(options.limit) > 0
          ? String(Number(options.limit))
          : '',
    }
  )
  return {
    events: Array.isArray(payload?.events) ? payload.events : [],
    cursor: Number.isFinite(payload?.cursor) ? Number(payload.cursor) : 0,
  }
}

export async function readColorAuditState(context, workspaceKey = context.colorAuditWorkspaceKey) {
  return readAgentNativeWorkspaceState(context, 'color-audit', workspaceKey)
}

export async function readColorAuditExportPreview(context, workspaceKey = context.colorAuditWorkspaceKey) {
  const payload = await readAgentNativeJson(
    context,
    '/api/agent-native/workspaces/color-audit/export-preview',
    {
      workspaceKey,
    }
  )
  return payload?.exportPreview ?? null
}

export async function readSystemCanvasState(context, workspaceKey = context.systemCanvasWorkspaceKey) {
  return readAgentNativeWorkspaceState(context, 'system-canvas', workspaceKey)
}

export async function readNodeCatalogState(context, workspaceKey = context.nodeCatalogWorkspaceKey) {
  return readAgentNativeWorkspaceState(context, 'node-catalog', workspaceKey)
}

export async function enqueueAgentNativeWorkspaceOperation(
  context,
  workspaceId,
  workspaceKey,
  operation,
  meta = {}
) {
  if (!workspaceId || typeof workspaceId !== 'string') {
    fail('workspaceId is required.')
  }
  if (!workspaceKey || typeof workspaceKey !== 'string') {
    fail('workspaceKey is required.')
  }
  if (!operation || typeof operation !== 'object') {
    fail('operation payload is required.')
  }

  return postAgentNativeJson(
    context,
    `/api/agent-native/workspaces/${encodeURIComponent(workspaceId)}/operations`,
    {
      workspaceKey,
      clientId: meta.clientId || context.sessionId || null,
      source: meta.source || 'canvas-agent-cli',
      operation,
    }
  )
}

async function buildWorkspaceScreenshotPayload(context, workspaceId, target) {
  const normalizedTarget = target === 'mobile' ? 'mobile' : 'desktop'

  switch (workspaceId) {
    case 'canvas':
      return {
        projectId: context.projectId,
        target: normalizedTarget,
        snapshot: await readCanvasAgentState(context),
      }
    case 'color-audit':
      return {
        projectId: context.projectId,
        workspaceKey: context.colorAuditWorkspaceKey,
        target: normalizedTarget,
        snapshot: await readColorAuditState(context),
      }
    case 'system-canvas':
      return {
        projectId: context.projectId,
        workspaceKey: context.systemCanvasWorkspaceKey,
        target: normalizedTarget,
        snapshot: await readSystemCanvasState(context),
      }
    case 'node-catalog':
      return {
        projectId: context.projectId,
        target: normalizedTarget,
      }
    default:
      fail(`Unsupported screenshot workspace: ${workspaceId}`)
  }
}

export async function captureWorkspaceScreenshot(context, workspaceId, target = 'desktop') {
  const payload = await buildWorkspaceScreenshotPayload(context, workspaceId, target)
  const response = await postAgentNativeJson(
    context,
    `/api/agent-native/workspaces/${encodeURIComponent(workspaceId)}/screenshot`,
    payload
  )
  return response?.capture ?? null
}

export async function enqueueCanvasAgentOperation(context, toolName, operation, meta = {}) {
  const requestId = `canvas-agent-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const queuePath = path.join(context.sessionDir, 'queue', `${requestId}.json`)
  const resultPath = path.join(context.sessionDir, 'results', `${requestId}.json`)

  await writeFile(
    queuePath,
    JSON.stringify(
      {
        id: requestId,
        sessionId: context.sessionId,
        projectId: context.projectId,
        source: meta.source || 'canvas-agent-cli',
        toolName,
        operation,
      },
      null,
      2
    )
  )

  return waitForJsonFile(resultPath, meta.timeoutMs)
}

export function parseCanvasAgentIds(value) {
  if (!value) fail('At least one id is required.')
  const ids = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (ids.length === 0) fail('At least one id is required.')
  return ids
}

export async function readJsonPayload(ref) {
  if (!ref) fail('Missing JSON payload.')
  if (ref === '-') {
    return JSON.parse(await readStdin())
  }
  if (ref.startsWith('@')) {
    return JSON.parse(await readFile(ref.slice(1), 'utf8'))
  }
  return JSON.parse(ref)
}

export async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

export async function waitForJsonFile(filePath, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await readJsonFile(filePath)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        await sleep(100)
        continue
      }
      throw error
    }
  }
  fail(`Timed out waiting for canvas result at ${filePath}`)
}

export function buildCanvasContextSummary(state, primitives) {
  const safeState = state && typeof state === 'object' ? state : { items: [], groups: [], selectedIds: [] }
  const items = Array.isArray(safeState.items) ? safeState.items : []
  const groups = Array.isArray(safeState.groups) ? safeState.groups : []
  const selectedIds = Array.isArray(safeState.selectedIds) ? safeState.selectedIds : []
  const primitiveMap = new Map(
    (Array.isArray(primitives) ? primitives : []).map((primitive) => [primitive.entryId, primitive])
  )

  const summarizeItem = (item) => {
    if (!item || typeof item !== 'object') return null
    const base = {
      id: item.id,
      type: item.type,
      position: item.position || null,
      size: item.size || null,
      rotation: Number.isFinite(item.rotation) ? item.rotation : 0,
      parentId: item.parentId || null,
      groupId: item.groupId || null,
      zIndex: Number.isFinite(item.zIndex) ? item.zIndex : 0,
    }

    if (item.type === 'component') {
      const primitive = primitiveMap.get(item.componentId)
      return {
        ...base,
        componentId: item.componentId,
        variantIndex: Number.isFinite(item.variantIndex) ? item.variantIndex : 0,
        customPropKeys: item.customProps && typeof item.customProps === 'object' ? Object.keys(item.customProps) : [],
        primitive: primitive
          ? {
              primitiveId: primitive.primitiveId,
              name: primitive.name,
              family: primitive.family,
              level: primitive.level,
              htmlTag: primitive.htmlTag || null,
              exportable: primitive.exportable !== false,
            }
          : null,
      }
    }

    if (item.type === 'artboard') {
      return {
        ...base,
        name: item.name,
        background: item.background || null,
        themeId: item.themeId || null,
        layout: item.layout || null,
      }
    }

    if (item.type === 'markdown' || item.type === 'mermaid') {
      return {
        ...base,
        title: item.title || null,
        preview: typeof item.source === 'string' ? item.source.slice(0, 180) : null,
      }
    }

    if (item.type === 'excalidraw') {
      return {
        ...base,
        title: item.title || null,
        sourceMermaidPreview:
          typeof item.sourceMermaid === 'string' ? item.sourceMermaid.slice(0, 120) : null,
      }
    }

    if (item.type === 'embed') {
      return {
        ...base,
        title: item.title || null,
        url: item.url,
        previewMode: item.embedPreviewMode || null,
      }
    }

    if (item.type === 'media') {
      return {
        ...base,
        title: item.title || null,
        src: item.src,
        mediaKind: item.mediaKind || null,
      }
    }

    return base
  }

  const itemCountsByType = items.reduce((acc, item) => {
    const type = typeof item?.type === 'string' ? item.type : 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const artboards = items
    .filter((item) => item?.type === 'artboard')
    .map((artboard) => {
      const children = items
        .filter((item) => item?.parentId === artboard.id)
        .map(summarizeItem)
        .filter(Boolean)
      return {
        id: artboard.id,
        name: artboard.name,
        position: artboard.position || null,
        size: artboard.size || null,
        themeId: artboard.themeId || null,
        childCount: children.length,
        children,
      }
    })

  const looseItems = items
    .filter((item) => item?.type !== 'artboard' && !item?.parentId)
    .map(summarizeItem)
    .filter(Boolean)

  return {
    itemCount: items.length,
    groupCount: groups.length,
    selectedIds,
    itemCountsByType,
    artboards,
    looseItems,
  }
}

export function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

export function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
