export interface CanvasMarkdownWriteClientState {
  source: string
  sourcePath?: string
  sourceFileMtime?: number
}

export type CanvasMarkdownMutation =
  | { type: "updateMarkdownBlock"; blockIndex: number; newText: string }
  | { type: "reorderMarkdownBlocks"; fromIndex: number; toIndex: number }

export interface CanvasMarkdownWriteClientResult {
  source: string
  mtimeMs?: number
  filePath?: string
  prevSourceSnapshot?: string
  mutations: CanvasMarkdownMutation[]
}

export async function performCanvasMarkdownWrite(
  state: CanvasMarkdownWriteClientState,
  request:
    | { action: "update"; blockIndex: number; newText: string }
    | { action: "reorder"; fromIndex: number; toIndex: number },
  fetchImpl: typeof fetch = fetch
): Promise<CanvasMarkdownWriteClientResult> {
  const response = await fetchImpl("/api/canvas/markdown/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: request.action,
      markdownSource: state.sourcePath ? undefined : state.source,
      filePath: state.sourcePath,
      mtimeMs: state.sourceFileMtime,
      ...(request.action === "update"
        ? { blockIndex: request.blockIndex, newText: request.newText }
        : { fromIndex: request.fromIndex, toIndex: request.toIndex }),
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    source?: string
    mtimeMs?: number | null
    filePath?: string | null
    prevSourceSnapshot?: string
    error?: string
    code?: string
  }
  if (!response.ok || !payload.ok || typeof payload.source !== "string") {
    const errorMessage =
      payload.error ||
      (request.action === "update" ? "Failed to update markdown block." : "Failed to reorder markdown blocks.")
    throw new Error(
      payload.code === "mtime-conflict"
        ? `${errorMessage} The file changed on disk since it was loaded.`
        : errorMessage
    )
  }
  return {
    source: payload.source,
    ...(typeof payload.filePath === "string" ? { filePath: payload.filePath } : {}),
    ...(typeof payload.prevSourceSnapshot === "string"
      ? { prevSourceSnapshot: payload.prevSourceSnapshot }
      : {}),
    ...(typeof payload.mtimeMs === "number" ? { mtimeMs: payload.mtimeMs } : {}),
    mutations:
      request.action === "update"
        ? [{ type: "updateMarkdownBlock" as const, blockIndex: request.blockIndex, newText: request.newText }]
        : [{ type: "reorderMarkdownBlocks" as const, fromIndex: request.fromIndex, toIndex: request.toIndex }],
  }
}
