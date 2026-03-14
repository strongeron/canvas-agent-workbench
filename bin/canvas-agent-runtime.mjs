import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_TIMEOUT_MS = 15000

export function getCanvasAgentContextFromEnv() {
  const sessionDir = process.env.CANVAS_AGENT_SESSION_DIR?.trim()
  const projectId = process.env.CANVAS_AGENT_PROJECT_ID?.trim()
  const sessionId = process.env.CANVAS_AGENT_SESSION_ID?.trim()

  if (!sessionDir) fail('CANVAS_AGENT_SESSION_DIR is not set.')
  if (!projectId) fail('CANVAS_AGENT_PROJECT_ID is not set.')
  if (!sessionId) fail('CANVAS_AGENT_SESSION_ID is not set.')

  return {
    sessionDir,
    projectId,
    sessionId,
  }
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
