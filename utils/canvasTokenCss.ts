import { promises as fs } from "node:fs"
import path from "node:path"

import postcss from "postcss"

export interface CanvasDesignToken {
  name: string
  value: string
  category: "color" | "typography" | "spacing" | "radius" | "shadow" | "other"
}

export type CanvasTokenWriteInput =
  | { type: "set"; name: string; value: string }
  | { type: "delete"; name: string }

export type CanvasTokensResponse =
  | {
      ok: true
      projectId: string
      filePath: string
      tokens: CanvasDesignToken[]
      sourceCss: string
      mtimeMs: number | null
    }
  | {
      ok: false
      status: number
      code: string
      error: string
    }

export type CanvasTokenWriteResponse =
  | {
      ok: true
      projectId: string
      filePath: string
      sourceCss: string
      tokens: CanvasDesignToken[]
      appliedMutations: number
      mtimeMs: number
    }
  | {
      ok: false
      status: number
      code: string
      error: string
    }

const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/
const TOKEN_NAME_PATTERN = /^--[A-Za-z0-9_-]+$/

export async function listProjectDesignTokens(
  body: { projectId?: unknown },
  options: { workspaceRoot: string }
): Promise<CanvasTokensResponse> {
  const projectId = normalizeProjectId(body.projectId)
  if (!projectId) {
    return badProjectId()
  }
  const tokensPath = path.join(options.workspaceRoot, "projects", projectId, "tokens.css")
  try {
    const [sourceCss, stat] = await Promise.all([fs.readFile(tokensPath, "utf8"), fs.stat(tokensPath)])
    return {
      ok: true,
      projectId,
      filePath: path.relative(options.workspaceRoot, tokensPath),
      sourceCss,
      tokens: parseDesignTokens(sourceCss),
      mtimeMs: stat.mtimeMs,
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === "ENOENT") {
      return {
        ok: true,
        projectId,
        filePath: path.relative(options.workspaceRoot, tokensPath),
        sourceCss: "",
        tokens: [],
        mtimeMs: null,
      }
    }
    return {
      ok: false,
      status: 500,
      code: "read-failed",
      error: error instanceof Error ? error.message : "Failed to read tokens.css.",
    }
  }
}

export async function writeProjectDesignToken(
  body: { projectId?: unknown; mutation?: unknown; mtimeMs?: unknown },
  options: { workspaceRoot: string }
): Promise<CanvasTokenWriteResponse> {
  const projectId = normalizeProjectId(body.projectId)
  if (!projectId) return badProjectId()
  const mutation = normalizeTokenMutation(body.mutation)
  if (!mutation) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "mutation must be { type: 'set', name, value } or { type: 'delete', name }.",
    }
  }

  const projectDir = path.join(options.workspaceRoot, "projects", projectId)
  const tokensPath = path.join(projectDir, "tokens.css")
  const expectedMtime = typeof body.mtimeMs === "number" ? body.mtimeMs : null
  let current = ""
  let exists = false
  let statMtime: number | null = null

  try {
    const [sourceCss, stat] = await Promise.all([fs.readFile(tokensPath, "utf8"), fs.stat(tokensPath)])
    current = sourceCss
    exists = true
    statMtime = stat.mtimeMs
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code !== "ENOENT") {
      return {
        ok: false,
        status: 500,
        code: "read-failed",
        error: error instanceof Error ? error.message : "Failed to read tokens.css.",
      }
    }
  }

  if (exists && expectedMtime === null) {
    return {
      ok: false,
      status: 409,
      code: "mtime-required",
      error: "mtimeMs is required when tokens.css already exists.",
    }
  }
  if (exists && expectedMtime !== null && statMtime !== null && Math.abs(statMtime - expectedMtime) > 1) {
    return {
      ok: false,
      status: 409,
      code: "mtime-conflict",
      error: "tokens.css changed externally; reload to continue editing.",
    }
  }

  let nextCss: string
  try {
    nextCss = applyTokenMutation(current, mutation)
    parseDesignTokens(nextCss)
  } catch (error) {
    return {
      ok: false,
      status: 400,
      code: "parse-error",
      error: error instanceof Error ? error.message : "Failed to parse token CSS.",
    }
  }

  await fs.mkdir(projectDir, { recursive: true })
  const tmpPath = `${tokensPath}.${process.pid}.${Date.now()}.tmp`
  try {
    await fs.writeFile(tmpPath, nextCss, "utf8")
    await fs.rename(tmpPath, tokensPath)
    await syncDesignTokensTs(options.workspaceRoot, projectId, mutation)
  } catch (error) {
    await fs.rm(tmpPath, { force: true }).catch(() => undefined)
    return {
      ok: false,
      status: 500,
      code: "write-failed",
      error: error instanceof Error ? error.message : "Failed to write tokens.css.",
    }
  }

  const nextStat = await fs.stat(tokensPath)
  return {
    ok: true,
    projectId,
    filePath: path.relative(options.workspaceRoot, tokensPath),
    sourceCss: nextCss,
    tokens: parseDesignTokens(nextCss),
    appliedMutations: nextCss === current ? 0 : 1,
    mtimeMs: nextStat.mtimeMs,
  }
}

export function parseDesignTokens(sourceCss: string): CanvasDesignToken[] {
  const root = postcss.parse(sourceCss || "")
  const tokens: CanvasDesignToken[] = []
  root.walkDecls((decl) => {
    if (!decl.prop.startsWith("--")) return
    tokens.push({
      name: decl.prop,
      value: decl.value,
      category: inferTokenCategory(decl.prop, decl.value),
    })
  })
  return tokens
}

export function applyTokenMutation(sourceCss: string, mutation: CanvasTokenWriteInput): string {
  const root = postcss.parse(sourceCss || ":root {\n}\n")
  let rootRule: postcss.Rule | null = null
  root.walkRules((rule) => {
    if (rule.selector === ":root" && !rootRule) rootRule = rule
  })
  if (!rootRule) {
    rootRule = postcss.rule({ selector: ":root" })
    root.append(rootRule)
  }

  const existing = (rootRule.nodes ?? []).find(
    (node): node is postcss.Declaration => node.type === "decl" && node.prop === mutation.name
  )

  if (mutation.type === "delete") {
    existing?.remove()
    return root.toString().trimEnd() + "\n"
  }

  if (existing) {
    existing.value = mutation.value
  } else {
    rootRule.append({ prop: mutation.name, value: mutation.value })
  }
  return root.toString().trimEnd() + "\n"
}

function normalizeProjectId(input: unknown): string | null {
  const projectId = typeof input === "string" && input.trim() ? input.trim() : "design-system-foundation"
  return PROJECT_ID_PATTERN.test(projectId) ? projectId : null
}

function badProjectId(): Extract<CanvasTokensResponse, { ok: false }> {
  return {
    ok: false,
    status: 400,
    code: "bad-input",
    error: "projectId must contain only letters, digits, hyphens, or underscores.",
  }
}

function normalizeTokenMutation(input: unknown): CanvasTokenWriteInput | null {
  if (!input || typeof input !== "object") return null
  const value = input as Record<string, unknown>
  const name = typeof value.name === "string" ? value.name.trim() : ""
  if (!TOKEN_NAME_PATTERN.test(name)) return null
  if (value.type === "delete") return { type: "delete", name }
  if (value.type === "set" && typeof value.value === "string" && value.value.trim()) {
    return { type: "set", name, value: value.value.trim() }
  }
  return null
}

function inferTokenCategory(name: string, value: string): CanvasDesignToken["category"] {
  if (name.startsWith("--color-") || /^(#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|color\()/.test(value)) return "color"
  if (name.includes("font") || name.includes("type") || (/rem|em|px/.test(value) && name.includes("text"))) {
    return "typography"
  }
  if (name.includes("space") || name.includes("spacing") || name.includes("gap")) return "spacing"
  if (name.includes("radius")) return "radius"
  if (name.includes("shadow")) return "shadow"
  return "other"
}

async function syncDesignTokensTs(
  workspaceRoot: string,
  projectId: string,
  mutation: CanvasTokenWriteInput
): Promise<void> {
  if (projectId !== "design-system-foundation" || mutation.type !== "set") return
  const designTokensPath = path.join(workspaceRoot, "projects", projectId, "designTokens.ts")
  let source: string
  try {
    source = await fs.readFile(designTokensPath, "utf8")
  } catch {
    return
  }
  const escapedName = escapeRegExp(mutation.name)
  const objectPattern = /\{\s*name:\s*["'][^"']+["'][\s\S]*?\}/g
  const next = source.replace(objectPattern, (block) => {
    if (!new RegExp(`cssVar:\\s*["']${escapedName}["']`).test(block)) return block
    return block.replace(/(value:\s*["'])([^"']*)(["'])/, `$1${escapeTsString(mutation.value)}$3`)
  })
  if (next === source) return
  const tmpPath = `${designTokensPath}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmpPath, next, "utf8")
  await fs.rename(tmpPath, designTokensPath)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function escapeTsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}
