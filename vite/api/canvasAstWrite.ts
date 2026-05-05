import { promises as fs } from "node:fs"
import path from "node:path"

import {
  writeCanvasAstNode,
  type CanvasAstMutation,
} from "../../utils/canvasAstWriter"

interface CanvasAstWriteBody {
  sourceReact?: unknown
  filePath?: unknown
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
      sourceReact: string
      appliedMutations: number
      mtimeMs: number | null
      filePath: string | null
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
  const canvasId = typeof body.canvasId === "string" ? body.canvasId : ""
  const sourceId = typeof body.sourceId === "string" ? body.sourceId : ""
  const mutations = normalizeMutations(body.mutations)
  const filePath = typeof body.filePath === "string" && body.filePath.trim() ? body.filePath.trim() : null

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
  if (!sourceReact) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "sourceReact is required when filePath is not provided.",
    }
  }

  const result = writeCanvasAstNode(sourceReact, canvasId, mutations, { sourceId })
  if (!result.ok) {
    return { ok: false, status: 400, code: result.code, error: result.error }
  }

  return {
    ok: true,
    sourceReact: result.source,
    appliedMutations: result.appliedMutations,
    mtimeMs: null,
    filePath: null,
  }
}

async function writeFileBackedSource(
  input: {
    filePath: string
    canvasId: string
    sourceId: string
    mutations: CanvasAstMutation[]
    mtimeMs: unknown
  },
  options: CanvasAstWriteOptions
): Promise<CanvasAstWriteResponse> {
  const resolved = resolveWorkspacePath(input.filePath, options.workspaceRoot)
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
  const result = writeCanvasAstNode(source, input.canvasId, input.mutations, {
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
  return {
    ok: true,
    sourceReact: result.source,
    appliedMutations: result.appliedMutations,
    mtimeMs: nextStat.mtimeMs,
    filePath: path.relative(options.workspaceRoot, resolved),
  }
}

export function resolveWorkspacePath(filePath: string, workspaceRoot: string): string | null {
  const resolved = path.resolve(workspaceRoot, filePath)
  const relative = path.relative(workspaceRoot, resolved)
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null
  if (!/\.(tsx|jsx)$/.test(resolved)) return null
  return resolved
}

function normalizeMutations(input: unknown): CanvasAstMutation[] {
  if (!Array.isArray(input)) return []
  return input
    .map((entry): CanvasAstMutation | null => {
      if (!entry || typeof entry !== "object") return null
      const mutation = entry as Record<string, unknown>
      if (mutation.type === "setTextChild" && typeof mutation.value === "string") {
        return { type: "setTextChild", value: mutation.value }
      }
      if (mutation.type === "setClassName" && typeof mutation.value === "string") {
        return { type: "setClassName", value: mutation.value }
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
      return null
    })
    .filter((entry): entry is CanvasAstMutation => Boolean(entry))
}
