import path from "node:path"

import type { CanvasMcpAppTransport } from "../../../utils/mcpApp"
import {
  describeHttpTransportSignature,
  isHttpTransportAllowlisted,
  persistAllowlistedHttpTransport,
} from "./httpAllowlist"
import { sanitizeProjectId } from "./projectIdSafety"
import { connectMcpAppNode } from "./registry"
import {
  describeTransportSignature,
  isTransportAllowlisted,
  persistAllowlistedTransport,
} from "./stdioAllowlist"

export async function applyCanvasMcpAppConnectRequest(
  body: any,
  options: { workspaceRoot: string }
) {
  const projectId = sanitizeProjectId(body?.projectId)
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : ""
  const appName = typeof body?.appName === "string" ? body.appName.trim() : "MCP app"
  const transport = body?.transport as CanvasMcpAppTransport | undefined
  if (!projectId || !nodeId || !transport || typeof transport !== "object" || !transport.kind) {
    return { ok: false, status: 400, code: "bad-input", error: "projectId, nodeId, and transport are required." }
  }

  if (transport.kind === "stdio") {
    const projectDir = path.join(options.workspaceRoot, "projects", projectId)
    const allowlisted = await isTransportAllowlisted(projectDir, projectId, transport)
    if (!allowlisted && body?.confirmed !== true) {
      return {
        ok: false,
        status: 403,
        code: "requires-user-confirm",
        error: `Stdio command requires user confirmation: ${describeTransportSignature(transport)}`,
      }
    }
    if (body?.confirmed === true) {
      await persistAllowlistedTransport(projectDir, projectId, transport)
    }
  } else if (transport.kind === "http") {
    if (typeof transport.url !== "string" || !transport.url.trim()) {
      return { ok: false, status: 400, code: "bad-input", error: "transport.url is required." }
    }
    const projectDir = path.join(options.workspaceRoot, "projects", projectId)
    const allowlisted = await isHttpTransportAllowlisted(projectDir, projectId, transport)
    if (!allowlisted && body?.confirmed !== true) {
      return {
        ok: false,
        status: 403,
        code: "requires-user-confirm",
        error: `HTTP transport requires user confirmation: ${describeHttpTransportSignature(transport)}`,
      }
    }
    if (body?.confirmed === true) {
      await persistAllowlistedHttpTransport(projectDir, projectId, transport)
    }
  }

  const result = await connectMcpAppNode({
    workspaceRoot: options.workspaceRoot,
    projectId,
    nodeId,
    transport,
  })
  return {
    ok: true,
    appName,
    status: result.status,
    tools: result.tools,
    resources: result.resources,
    prompts: result.prompts,
    lastError: result.lastError,
  }
}
