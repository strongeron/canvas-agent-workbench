import { promises as fs } from "node:fs"
import path from "node:path"

import {
  parseCanvasRegistry,
  type CanvasRegistryParseResult,
} from "../../utils/canvasRegistry"

interface CanvasRegistryListBody {
  projectId?: unknown
}

interface CanvasRegistryListOptions {
  workspaceRoot: string
}

export type CanvasRegistryListResponse =
  | {
      ok: true
      projectId: string
      primitives: CanvasRegistryParseResult["primitives"]
      warnings: string[]
    }
  | {
      ok: false
      status: number
      error: string
      code?: string
    }

const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export async function applyCanvasRegistryListRequest(
  body: CanvasRegistryListBody,
  options: CanvasRegistryListOptions
): Promise<CanvasRegistryListResponse> {
  const projectId =
    typeof body.projectId === "string" && body.projectId.trim()
      ? body.projectId.trim()
      : "design-system-foundation"

  if (!PROJECT_ID_PATTERN.test(projectId)) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "projectId must contain only letters, digits, hyphens, or underscores.",
    }
  }

  const registryPath = path.join(options.workspaceRoot, "projects", projectId, "registry.json")
  let raw: string
  try {
    raw = await fs.readFile(registryPath, "utf8")
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === "ENOENT") {
      return {
        ok: false,
        status: 404,
        code: "not-found",
        error: `No registry.json for project "${projectId}".`,
      }
    }
    return {
      ok: false,
      status: 500,
      code: "read-failed",
      error: error instanceof Error ? error.message : "Failed to read registry.",
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return {
      ok: false,
      status: 500,
      code: "parse-failed",
      error: error instanceof Error ? error.message : "Failed to parse registry.",
    }
  }

  const result = parseCanvasRegistry(parsed)
  return {
    ok: true,
    projectId,
    primitives: result.primitives,
    warnings: result.warnings,
  }
}
