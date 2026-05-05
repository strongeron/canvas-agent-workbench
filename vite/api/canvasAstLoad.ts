import { promises as fs } from "node:fs"
import path from "node:path"

import { resolveWorkspacePath } from "./canvasAstWrite"

interface CanvasAstLoadBody {
  filePath?: unknown
}

interface CanvasAstLoadOptions {
  workspaceRoot: string
}

export type CanvasAstLoadResponse =
  | {
      ok: true
      sourceReact: string
      mtimeMs: number
      filePath: string
    }
  | {
      ok: false
      status: number
      error: string
      code?: string
    }

export async function applyCanvasAstLoadRequest(
  body: CanvasAstLoadBody,
  options: CanvasAstLoadOptions
): Promise<CanvasAstLoadResponse> {
  const filePath = typeof body.filePath === "string" ? body.filePath.trim() : ""
  if (!filePath) {
    return { ok: false, status: 400, code: "bad-input", error: "filePath is required." }
  }

  const resolved = resolveWorkspacePath(filePath, options.workspaceRoot)
  if (!resolved) {
    return {
      ok: false,
      status: 403,
      code: "bad-path",
      error: "filePath must resolve inside the workspace and end in .tsx or .jsx.",
    }
  }

  try {
    const [source, stat] = await Promise.all([fs.readFile(resolved, "utf8"), fs.stat(resolved)])
    return {
      ok: true,
      sourceReact: source,
      mtimeMs: stat.mtimeMs,
      filePath: path.relative(options.workspaceRoot, resolved),
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === "ENOENT") {
      return { ok: false, status: 404, code: "not-found", error: "File does not exist." }
    }
    return {
      ok: false,
      status: 500,
      code: "read-failed",
      error: error instanceof Error ? error.message : "Failed to read TSX file.",
    }
  }
}
