import { getMcpAppLog } from "./registry"

export async function applyCanvasMcpAppLogRequest(body: any) {
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : ""
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : ""
  const limit = Number.isFinite(body?.limit) ? Number(body.limit) : 20
  if (!projectId || !nodeId) {
    return { ok: false, status: 400, code: "bad-input", error: "projectId and nodeId are required." }
  }
  return {
    ok: true,
    recentCalls: getMcpAppLog(projectId, nodeId, limit),
  }
}
