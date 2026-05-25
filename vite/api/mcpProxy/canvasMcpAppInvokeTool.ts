import { redactToolArgs } from "./logRedaction"
import { invokeMcpAppTool } from "./registry"
import { validateCallerDepth } from "./recursionBound"

export async function applyCanvasMcpAppInvokeToolRequest(body: any) {
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : ""
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
  const depthResult = validateCallerDepth(body?.callerDepth)
  if (!depthResult.ok) return depthResult

  const result = await invokeMcpAppTool({
    projectId,
    nodeId,
    toolName,
    args,
    redactedArgs: redactToolArgs(args) as Record<string, unknown>,
  })
  return {
    ok: true,
    callerDepth: depthResult.callerDepth,
    result: result.result,
    recentCalls: result.recentCalls,
  }
}
