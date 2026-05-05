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
      sourceReact?: string
      sourceHtml?: string
      sourceCss?: string
      source: string
      mtimeMs: number
      filePath: string
      kind: "tsx" | "html" | "css"
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

  const resolved = resolveWorkspacePath(filePath, options.workspaceRoot, [".tsx", ".jsx", ".html", ".css"])
  if (!resolved) {
    return {
      ok: false,
      status: 403,
      code: "bad-path",
      error: "filePath must resolve inside the workspace and end in .tsx, .jsx, .html, or .css.",
    }
  }

  try {
    const [source, stat] = await Promise.all([fs.readFile(resolved, "utf8"), fs.stat(resolved)])
    const extension = path.extname(resolved).toLowerCase()
    const kind = extension === ".html" ? "html" : extension === ".css" ? "css" : "tsx"
    return {
      ok: true,
      ...(kind === "html" ? { sourceHtml: source } : kind === "css" ? { sourceCss: source } : { sourceReact: source }),
      source,
      mtimeMs: stat.mtimeMs,
      filePath: path.relative(options.workspaceRoot, resolved),
      kind,
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
      error: error instanceof Error ? error.message : "Failed to read source file.",
    }
  }
}
