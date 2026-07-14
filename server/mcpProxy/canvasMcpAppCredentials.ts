import path from "node:path"

import { sanitizeProjectId } from "./projectIdSafety"
import { writeMcpAppSecret } from "./projectMeta"

function isValidSecret(secret: unknown): secret is string | Record<string, string> {
  if (typeof secret === "string") return secret.length > 0
  if (!secret || typeof secret !== "object" || Array.isArray(secret)) return false
  // Plain object: every value must be a non-empty string. This rejects
  // `{}`, `{ k: null }`, `{ k: 1 }`, etc.
  const entries = Object.entries(secret as Record<string, unknown>)
  if (entries.length === 0) return false
  return entries.every(([, v]) => typeof v === "string" && v.length > 0)
}

export async function applyCanvasMcpAppCredentialsRequest(
  body: any,
  options: { workspaceRoot: string }
) {
  const projectId = sanitizeProjectId(body?.projectId)
  const ref = typeof body?.ref === "string" ? body.ref.trim() : ""
  const secret = body?.secret
  if (!projectId || !ref || !isValidSecret(secret)) {
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
