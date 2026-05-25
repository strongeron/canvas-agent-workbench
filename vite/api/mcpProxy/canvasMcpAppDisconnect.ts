import { disconnectMcpAppNode } from "./registry"

export async function applyCanvasMcpAppDisconnectRequest(body: any) {
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : ""
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : ""
  if (!projectId || !nodeId) {
    return { ok: false, status: 400, code: "bad-input", error: "projectId and nodeId are required." }
  }
  const result = await disconnectMcpAppNode({ projectId, nodeId })
  return result
}
