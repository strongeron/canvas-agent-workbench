import { promises as fs } from "node:fs"
import path from "node:path"

import {
  listMarkdownBlocks,
  removeMarkdownBlock,
  reorderMarkdownBlocks,
  updateMarkdownBlock,
  type MarkdownBlockInfo,
} from "../../utils/canvasMarkdownWriter"
import { resolveWorkspacePath } from "./canvasAstWrite"

interface CanvasMarkdownWriteBody {
  action?: unknown
  markdownSource?: unknown
  filePath?: unknown
  mtimeMs?: unknown
  blockIndex?: unknown
  newText?: unknown
  fromIndex?: unknown
  toIndex?: unknown
}

interface CanvasMarkdownWriteOptions {
  workspaceRoot: string
}

export type CanvasMarkdownWriteResponse =
  | {
      ok: true
      action: "list" | "update" | "remove" | "reorder"
      source: string
      blocks: MarkdownBlockInfo[]
      mtimeMs: number | null
      filePath: string | null
    }
  | {
      ok: false
      status: number
      error: string
      code?: string
    }

export async function applyCanvasMarkdownWriteRequest(
  body: CanvasMarkdownWriteBody,
  options: CanvasMarkdownWriteOptions
): Promise<CanvasMarkdownWriteResponse> {
  const action = normalizeAction(body.action)
  if (!action) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "action must be one of list, update, remove, or reorder.",
    }
  }

  const filePath = typeof body.filePath === "string" && body.filePath.trim() ? body.filePath.trim() : null
  const inlineSource = typeof body.markdownSource === "string" ? body.markdownSource : null

  if (filePath) {
    return applyFileBackedMarkdownWrite(
      {
        action,
        filePath,
        mtimeMs: body.mtimeMs,
        blockIndex: body.blockIndex,
        newText: body.newText,
        fromIndex: body.fromIndex,
        toIndex: body.toIndex,
      },
      options
    )
  }

  if (inlineSource === null) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "markdownSource is required when filePath is not provided.",
    }
  }

  return applyMarkdownAction(
    action,
    inlineSource,
    {
      blockIndex: body.blockIndex,
      newText: body.newText,
      fromIndex: body.fromIndex,
      toIndex: body.toIndex,
    },
    null,
    null
  )
}

async function applyFileBackedMarkdownWrite(
  input: {
    action: "list" | "update" | "remove" | "reorder"
    filePath: string
    mtimeMs: unknown
    blockIndex: unknown
    newText: unknown
    fromIndex: unknown
    toIndex: unknown
  },
  options: CanvasMarkdownWriteOptions
): Promise<CanvasMarkdownWriteResponse> {
  const resolved = resolveWorkspacePath(input.filePath, options.workspaceRoot, [".md"])
  if (!resolved) {
    return {
      ok: false,
      status: 403,
      code: "bad-path",
      error: "filePath must resolve inside the workspace and end in .md.",
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
  const result = applyMarkdownAction(
    input.action,
    source,
    {
      blockIndex: input.blockIndex,
      newText: input.newText,
      fromIndex: input.fromIndex,
      toIndex: input.toIndex,
    },
    stat.mtimeMs,
    path.relative(options.workspaceRoot, resolved)
  )
  if (!result.ok || input.action === "list" || result.source === source) {
    return result
  }

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
      error: error instanceof Error ? error.message : "Failed to write markdown file.",
    }
  }

  const nextStat = await fs.stat(resolved)
  return {
    ...result,
    mtimeMs: nextStat.mtimeMs,
  }
}

function applyMarkdownAction(
  action: "list" | "update" | "remove" | "reorder",
  source: string,
  input: {
    blockIndex: unknown
    newText: unknown
    fromIndex: unknown
    toIndex: unknown
  },
  mtimeMs: number | null,
  filePath: string | null
): CanvasMarkdownWriteResponse {
  if (action === "list") {
    const blocks = listMarkdownBlocks(source)
    return { ok: true, action, source, blocks, mtimeMs, filePath }
  }

  const result =
    action === "update"
      ? updateMarkdownBlock(source, normalizeInteger(input.blockIndex), input.newText as string)
      : action === "remove"
        ? removeMarkdownBlock(source, normalizeInteger(input.blockIndex))
        : reorderMarkdownBlocks(source, normalizeInteger(input.fromIndex), normalizeInteger(input.toIndex))

  if (!result.ok) {
    const status = result.code === "out-of-range" ? 400 : 400
    return {
      ok: false,
      status,
      code: result.code,
      error: result.error,
    }
  }

  return {
    ok: true,
    action,
    source: result.source,
    blocks: listMarkdownBlocks(result.source),
    mtimeMs,
    filePath,
  }
}

function normalizeAction(action: unknown): "list" | "update" | "remove" | "reorder" | null {
  return action === "list" || action === "update" || action === "remove" || action === "reorder"
    ? action
    : null
}

function normalizeInteger(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN
}
