import path from "node:path"

import { writeMcpAppSecret } from "./projectMeta"

export async function applyCanvasMcpAppCredentialsRequest(
  body: any,
  options: { workspaceRoot: string }
) {
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : ""
  const ref = typeof body?.ref === "string" ? body.ref.trim() : ""
  const secret = body?.secret
  if (!projectId || !ref || (!secret || typeof secret !== "string") && (typeof secret !== "object" || Array.isArray(secret))) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "projectId, ref, and secret are required.",
    }
  }
  const projectDir = path.join(options.workspaceRoot, "projects", projectId)
  await writeMcpAppSecret(projectDir, projectId, ref, secret)
  return {
    ok: true,
    ref,
  }
}
