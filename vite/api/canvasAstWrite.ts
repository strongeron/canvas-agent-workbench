import { promises as fs } from "node:fs"
import path from "node:path"

import {
  writeCanvasAstNode,
  type CanvasAstMutation,
} from "../../utils/canvasAstWriter"
import {
  writeCanvasHtmlNode,
  type CanvasHtmlMutation,
} from "../../utils/canvasHtmlEditor"

interface CanvasAstWriteBody {
  sourceReact?: unknown
  sourceHtml?: unknown
  filePath?: unknown
  sourceSnapshot?: unknown
  canvasId?: unknown
  sourceId?: unknown
  mutations?: unknown
  mtimeMs?: unknown
}

interface CanvasAstWriteOptions {
  workspaceRoot: string
}

export type CanvasAstWriteResponse =
  | {
      ok: true
      sourceReact?: string
      sourceHtml?: string
      appliedMutations: number
      canvasIdMap?: Record<string, string | null>
      prevSourceSnapshot?: string
      mtimeMs: number | null
      filePath: string | null
      kind: "tsx" | "html"
    }
  | {
      ok: false
      status: number
      error: string
      code?: string
    }

export async function applyCanvasAstWriteRequest(
  body: CanvasAstWriteBody,
  options: CanvasAstWriteOptions
): Promise<CanvasAstWriteResponse> {
  const filePath = typeof body.filePath === "string" && body.filePath.trim() ? body.filePath.trim() : null
  const sourceSnapshot = typeof body.sourceSnapshot === "string" ? body.sourceSnapshot : null
  if (filePath && sourceSnapshot !== null) {
    return writeFileBackedSnapshot({ filePath, sourceSnapshot, mtimeMs: body.mtimeMs }, options)
  }

  const sourceId = typeof body.sourceId === "string" ? body.sourceId : ""
  const mutations = normalizeMutations(body.mutations)
  const canvasId =
    (typeof body.canvasId === "string" ? body.canvasId : "") || inferMutationCanvasId(mutations)

  if (!canvasId || !sourceId || mutations.length === 0) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "canvasId, sourceId, and mutations are required.",
    }
  }

  if (filePath) {
    return writeFileBackedSource({ filePath, canvasId, sourceId, mutations, mtimeMs: body.mtimeMs }, options)
  }

  const sourceReact = typeof body.sourceReact === "string" ? body.sourceReact : ""
  const sourceHtml = typeof body.sourceHtml === "string" ? body.sourceHtml : ""
  if (sourceHtml) {
    const result = writeCanvasHtmlNode(sourceHtml, canvasId, mutations, { sourceId })
    if (!result.ok) {
      return { ok: false, status: 400, code: result.code, error: result.error }
    }
    return {
      ok: true,
      sourceHtml: result.source,
      appliedMutations: result.appliedMutations,
      canvasIdMap: result.canvasIdMap,
      prevSourceSnapshot: result.prevSourceSnapshot,
      mtimeMs: null,
      filePath: null,
      kind: "html",
    }
  }
  if (!sourceReact) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "sourceReact or sourceHtml is required when filePath is not provided.",
    }
  }

  const result = writeCanvasAstNode(sourceReact, canvasId, mutations as CanvasAstMutation[], { sourceId })
  if (!result.ok) {
    return { ok: false, status: 400, code: result.code, error: result.error }
  }

  return {
    ok: true,
    sourceReact: result.source,
    appliedMutations: result.appliedMutations,
    canvasIdMap: result.canvasIdMap,
    prevSourceSnapshot: result.prevSourceSnapshot,
    mtimeMs: null,
    filePath: null,
    kind: "tsx",
  }
}

async function writeFileBackedSource(
  input: {
    filePath: string
    canvasId: string
    sourceId: string
    mutations: Array<CanvasAstMutation | CanvasHtmlMutation>
    mtimeMs: unknown
  },
  options: CanvasAstWriteOptions
): Promise<CanvasAstWriteResponse> {
  const resolved = resolveWorkspacePath(input.filePath, options.workspaceRoot, [".tsx", ".jsx", ".html"])
  if (!resolved) {
    return {
      ok: false,
      status: 403,
      code: "bad-path",
      error: "filePath must resolve inside the workspace.",
    }
  }

  const stat = await fs.stat(resolved)
  const expectedMtime = typeof input.mtimeMs === "number" ? input.mtimeMs : null
  if (expectedMtime !== null && Math.abs(stat.mtimeMs - expectedMtime) > 1) {
    return {
      ok: false,
      status: 409,
      code: "mtime-conflict",
      error: "File changed externally; reload to continue editing.",
    }
  }

  const source = await fs.readFile(resolved, "utf8")
  const extension = path.extname(resolved).toLowerCase()
  const result =
    extension === ".html"
      ? writeCanvasHtmlNode(source, input.canvasId, input.mutations, { sourceId: input.sourceId })
      : writeCanvasAstNode(source, input.canvasId, input.mutations as CanvasAstMutation[], {
          sourceId: input.sourceId,
        })
  if (!result.ok) {
    return { ok: false, status: 400, code: result.code, error: result.error }
  }

  if (result.appliedMutations > 0) {
    const tmpPath = `${resolved}.${process.pid}.${Date.now()}.tmp`
    try {
      await fs.writeFile(tmpPath, result.source, "utf8")
      await fs.rename(tmpPath, resolved)
    } catch (error) {
      await fs.rm(tmpPath, { force: true }).catch(() => undefined)
      return {
        ok: false,
        status: 500,
        code: "write-failed",
        error: error instanceof Error ? error.message : "Failed to write TSX file.",
      }
    }
  }

  const nextStat = await fs.stat(resolved)
  const kind = extension === ".html" ? "html" : "tsx"
  return {
    ok: true,
    ...(kind === "html" ? { sourceHtml: result.source } : { sourceReact: result.source }),
    appliedMutations: result.appliedMutations,
    canvasIdMap: result.canvasIdMap,
    prevSourceSnapshot: result.prevSourceSnapshot,
    mtimeMs: nextStat.mtimeMs,
    filePath: path.relative(options.workspaceRoot, resolved),
    kind,
  }
}

async function writeFileBackedSnapshot(
  input: {
    filePath: string
    sourceSnapshot: string
    mtimeMs: unknown
  },
  options: CanvasAstWriteOptions
): Promise<CanvasAstWriteResponse> {
  const resolved = resolveWorkspacePath(input.filePath, options.workspaceRoot, [".tsx", ".jsx", ".html"])
  if (!resolved) {
    return {
      ok: false,
      status: 403,
      code: "bad-path",
      error: "filePath must resolve inside the workspace.",
    }
  }

  const stat = await fs.stat(resolved)
  const expectedMtime = typeof input.mtimeMs === "number" ? input.mtimeMs : null
  if (expectedMtime !== null && Math.abs(stat.mtimeMs - expectedMtime) > 1) {
    return {
      ok: false,
      status: 409,
      code: "mtime-conflict",
      error: "File changed externally; reload to continue editing.",
    }
  }

  const currentSource = await fs.readFile(resolved, "utf8")
  if (currentSource !== input.sourceSnapshot) {
    const tmpPath = `${resolved}.${process.pid}.${Date.now()}.tmp`
    try {
      await fs.writeFile(tmpPath, input.sourceSnapshot, "utf8")
      await fs.rename(tmpPath, resolved)
    } catch (error) {
      await fs.rm(tmpPath, { force: true }).catch(() => undefined)
      return {
        ok: false,
        status: 500,
        code: "write-failed",
        error: error instanceof Error ? error.message : "Failed to write source file.",
      }
    }
  }

  const nextStat = await fs.stat(resolved)
  const extension = path.extname(resolved).toLowerCase()
  const kind = extension === ".html" ? "html" : "tsx"
  return {
    ok: true,
    ...(kind === "html"
      ? { sourceHtml: input.sourceSnapshot }
      : { sourceReact: input.sourceSnapshot }),
    appliedMutations: currentSource === input.sourceSnapshot ? 0 : 1,
    canvasIdMap: {},
    prevSourceSnapshot: currentSource,
    mtimeMs: nextStat.mtimeMs,
    filePath: path.relative(options.workspaceRoot, resolved),
    kind,
  }
}

export function resolveWorkspacePath(
  filePath: string,
  workspaceRoot: string,
  allowedExtensions: string[] = [".tsx", ".jsx"]
): string | null {
  const resolved = path.resolve(workspaceRoot, filePath)
  const relative = path.relative(workspaceRoot, resolved)
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null
  const extension = path.extname(resolved).toLowerCase()
  if (!allowedExtensions.includes(extension)) return null
  return resolved
}

function normalizeMutations(input: unknown): Array<CanvasAstMutation | CanvasHtmlMutation> {
  if (!Array.isArray(input)) return []
  return input
    .map((entry): CanvasAstMutation | CanvasHtmlMutation | null => {
      if (!entry || typeof entry !== "object") return null
      const mutation = entry as Record<string, unknown>
      if (mutation.type === "setTextChild" && typeof mutation.value === "string") {
        return { type: "setTextChild", value: mutation.value }
      }
      if (mutation.type === "setClassName" && typeof mutation.value === "string") {
        return { type: "setClassName", value: mutation.value }
      }
      if (mutation.type === "setTextContent" && typeof mutation.value === "string") {
        return { type: "setTextContent", value: mutation.value }
      }
      if (
        mutation.type === "setAttribute" &&
        typeof mutation.attrName === "string" &&
        (typeof mutation.value === "string" ||
          typeof mutation.value === "number" ||
          typeof mutation.value === "boolean" ||
          mutation.value === null)
      ) {
        return {
          type: "setAttribute",
          attrName: mutation.attrName,
          value: mutation.value,
        }
      }
      if (
        mutation.type === "setPropValue" &&
        typeof mutation.propName === "string" &&
        ["string", "number", "boolean"].includes(typeof mutation.value)
      ) {
        const valueKind =
          mutation.valueKind === "string" ||
          mutation.valueKind === "number" ||
          mutation.valueKind === "boolean" ||
          mutation.valueKind === "identifier"
            ? mutation.valueKind
            : undefined
        return {
          type: "setPropValue",
          propName: mutation.propName,
          value: mutation.value as string | number | boolean,
          valueKind,
        }
      }
      if (
        mutation.type === "insertChild" &&
        typeof mutation.position === "number" &&
        typeof mutation.childSource === "string"
      ) {
        return {
          type: "insertChild",
          parentCanvasId:
            typeof mutation.parentCanvasId === "string" ? mutation.parentCanvasId : undefined,
          position: mutation.position,
          childSource: mutation.childSource,
        }
      }
      if (mutation.type === "removeNode") {
        return {
          type: "removeNode",
          canvasId: typeof mutation.canvasId === "string" ? mutation.canvasId : undefined,
        }
      }
      if (
        mutation.type === "reorderSibling" &&
        (mutation.direction === "up" || mutation.direction === "down")
      ) {
        return {
          type: "reorderSibling",
          canvasId: typeof mutation.canvasId === "string" ? mutation.canvasId : undefined,
          direction: mutation.direction,
        }
      }
      if (mutation.type === "wrapSelection" && typeof mutation.wrapperTag === "string") {
        return {
          type: "wrapSelection",
          canvasId: typeof mutation.canvasId === "string" ? mutation.canvasId : undefined,
          wrapperTag: mutation.wrapperTag,
        }
      }
      if (mutation.type === "unwrap") {
        return {
          type: "unwrap",
          canvasId: typeof mutation.canvasId === "string" ? mutation.canvasId : undefined,
        }
      }
      if (mutation.type === "swapTag" && typeof mutation.newTag === "string") {
        return {
          type: "swapTag",
          canvasId: typeof mutation.canvasId === "string" ? mutation.canvasId : undefined,
          newTag: mutation.newTag,
        }
      }
      return null
    })
    .filter((entry): entry is CanvasAstMutation | CanvasHtmlMutation => Boolean(entry))
}

function inferMutationCanvasId(mutations: Array<CanvasAstMutation | CanvasHtmlMutation>): string {
  for (const mutation of mutations) {
    if ("parentCanvasId" in mutation && typeof mutation.parentCanvasId === "string") {
      return mutation.parentCanvasId
    }
    if ("canvasId" in mutation && typeof mutation.canvasId === "string") {
      return mutation.canvasId
    }
  }
  return ""
}
