import { promises as fs } from "node:fs"
import path from "node:path"

import {
  listMarkdownBlocks,
  removeMarkdownBlock,
  reorderMarkdownBlocks,
  insertMarkdownBlock,
  updateMarkdownBlock,
  type MarkdownBlockInfo,
} from "../../utils/canvasMarkdownWriter"
import { resolveWorkspacePath } from "./canvasAstWrite"

interface CanvasMarkdownWriteBody {
  action?: unknown
  markdownSource?: unknown
  filePath?: unknown
  mtimeMs?: unknown
  sourceSnapshot?: unknown
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
      action: "list" | "update" | "insert" | "remove" | "reorder" | "rewrite"
      source: string
      blocks: MarkdownBlockInfo[]
      mtimeMs: number | null
      filePath: string | null
      prevSourceSnapshot?: string
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
  const filePath = typeof body.filePath === "string" && body.filePath.trim() ? body.filePath.trim() : null
  const inlineSource = typeof body.markdownSource === "string" ? body.markdownSource : null
  const sourceSnapshot = typeof body.sourceSnapshot === "string" ? body.sourceSnapshot : null

  if (filePath && sourceSnapshot !== null) {
    return applyFileBackedMarkdownRewrite(
      {
        filePath,
        mtimeMs: body.mtimeMs,
        sourceSnapshot,
      },
      options
    )
  }

  const action = normalizeAction(body.action)
  if (!action) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "action must be one of list, update, insert, remove, or reorder.",
    }
  }

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

async function applyFileBackedMarkdownRewrite(
  input: {
    filePath: string
    mtimeMs: unknown
    sourceSnapshot: string
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

  const previousSource = await fs.readFile(resolved, "utf8")
  if (previousSource === input.sourceSnapshot) {
    return {
      ok: true,
      action: "rewrite",
      source: input.sourceSnapshot,
      blocks: listMarkdownBlocks(input.sourceSnapshot),
      mtimeMs: stat.mtimeMs,
      filePath: path.relative(options.workspaceRoot, resolved),
      prevSourceSnapshot: previousSource,
    }
  }

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
      error: error instanceof Error ? error.message : "Failed to write markdown file.",
    }
  }

  const nextStat = await fs.stat(resolved)
  return {
    ok: true,
    action: "rewrite",
    source: input.sourceSnapshot,
    blocks: listMarkdownBlocks(input.sourceSnapshot),
    mtimeMs: nextStat.mtimeMs,
    filePath: path.relative(options.workspaceRoot, resolved),
    prevSourceSnapshot: previousSource,
  }
}

async function applyFileBackedMarkdownWrite(
  input: {
    action: "list" | "update" | "insert" | "remove" | "reorder"
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
  action: "list" | "update" | "insert" | "remove" | "reorder",
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
      : action === "insert"
        ? insertMarkdownBlock(source, normalizeInteger(input.blockIndex), input.newText as string)
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
    prevSourceSnapshot: source,
  }
}

function normalizeAction(action: unknown): "list" | "update" | "insert" | "remove" | "reorder" | null {
  return action === "list" ||
    action === "update" ||
    action === "insert" ||
    action === "remove" ||
    action === "reorder"
    ? action
    : null
}

function normalizeInteger(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN
}
