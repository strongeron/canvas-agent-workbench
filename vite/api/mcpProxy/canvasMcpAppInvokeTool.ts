import { redactToolArgs } from "./logRedaction"
import { sanitizeProjectId } from "./projectIdSafety"
import { invokeMcpAppTool } from "./registry"

export async function applyCanvasMcpAppInvokeToolRequest(body: any) {
  const projectId = sanitizeProjectId(body?.projectId)
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : ""
  const toolName = typeof body?.toolName === "string" ? body.toolName.trim() : ""
  const args =
    body?.args && typeof body.args === "object" && !Array.isArray(body.args) ? body.args : {}

  if (!projectId || !nodeId || !toolName) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "projectId, nodeId, and toolName are required.",
    }
  }

  // Note: depth bounding is enforced server-side per registry entry in
  // invokeMcpAppTool. The client-supplied callerDepth header has been removed
  // because any peer (including a malicious embedded MCP server) could simply
  // omit it.
  try {
    const result = await invokeMcpAppTool({
      projectId,
      nodeId,
      toolName,
      args,
      redactedArgs: redactToolArgs(args) as Record<string, unknown>,
    })
    return {
      ok: true,
      result: result.result,
      recentCalls: result.recentCalls,
    }
  } catch (error) {
    const err = error as Error & { code?: string; status?: number }
    if (err?.code === "recursion-too-deep") {
      return {
        ok: false,
        status: err.status ?? 429,
        code: err.code,
        error: err.message,
      }
    }
    throw error
  }
}
