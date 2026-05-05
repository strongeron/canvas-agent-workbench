import { promises as fs } from "node:fs"
import path from "node:path"

import { parseCanvasRegistry, type CanvasRegistryPrimitive } from "../../utils/canvasRegistry"

interface CanvasComponentCreateBody {
  projectId?: unknown
  name?: unknown
  format?: unknown
  sourceHtml?: unknown
  sourceCss?: unknown
  sourceTsx?: unknown
  description?: unknown
}

interface CanvasComponentCreateOptions {
  workspaceRoot: string
}

export type CanvasComponentCreateResponse =
  | {
      ok: true
      projectId: string
      primitive: CanvasRegistryPrimitive
      files: Array<{ filePath: string; mtimeMs: number }>
    }
  | {
      ok: false
      status: number
      code: string
      error: string
    }

const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export async function applyCanvasComponentCreateRequest(
  body: CanvasComponentCreateBody,
  options: CanvasComponentCreateOptions
): Promise<CanvasComponentCreateResponse> {
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

  const componentName = normalizeComponentName(body.name)
  if (!componentName) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "name must contain letters or digits.",
    }
  }

  const format = body.format === "tsx" ? "tsx" : "html"
  const projectRoot = path.join(options.workspaceRoot, "projects", projectId)
  const componentsRoot = path.join(projectRoot, "components")
  const registryPath = path.join(projectRoot, "registry.json")
  const description = typeof body.description === "string" ? body.description.trim() : ""

  if (format === "html") {
    const sourceHtml = typeof body.sourceHtml === "string" ? body.sourceHtml.trim() : ""
    if (!sourceHtml) {
      return { ok: false, status: 400, code: "bad-input", error: "sourceHtml is required." }
    }
    const htmlPath = path.join(componentsRoot, `${componentName}.html`)
    const cssSource = typeof body.sourceCss === "string" ? body.sourceCss.trim() : ""
    const cssPath = path.join(componentsRoot, `${componentName}.css`)
    const htmlRelative = path.relative(projectRoot, htmlPath)
    const cssRelative = path.relative(projectRoot, cssPath)
    const primitive: CanvasRegistryPrimitive = {
      id: `primitive/${toKebabCase(componentName)}`,
      displayName: componentName,
      category: "ui",
      kind: "html",
      filePath: htmlRelative,
      ...(cssSource ? { cssPath: cssRelative } : {}),
      componentSlug: toKebabCase(componentName),
      ...(description ? { description } : {}),
    }
    const writes = [{ filePath: htmlPath, source: ensureDataComponent(sourceHtml, primitive.componentSlug) }]
    if (cssSource) writes.push({ filePath: cssPath, source: cssSource.endsWith("\n") ? cssSource : `${cssSource}\n` })
    return writeComponentFilesAndRegistry({
      projectRoot,
      componentsRoot,
      registryPath,
      primitive,
      writes,
    })
  }

  const sourceTsx = typeof body.sourceTsx === "string" ? body.sourceTsx.trim() : ""
  if (!sourceTsx) {
    return { ok: false, status: 400, code: "bad-input", error: "sourceTsx is required." }
  }
  const tsxPath = path.join(componentsRoot, `${componentName}.tsx`)
  const primitive: CanvasRegistryPrimitive = {
    id: `primitive/${toKebabCase(componentName)}`,
    displayName: componentName,
    category: "ui",
    kind: "tsx",
    filePath: path.relative(projectRoot, tsxPath),
    importName: componentName,
    snippet: `<${componentName} />`,
    ...(description ? { description } : {}),
  }
  return writeComponentFilesAndRegistry({
    projectRoot,
    componentsRoot,
    registryPath,
    primitive,
    writes: [{ filePath: tsxPath, source: sourceTsx.endsWith("\n") ? sourceTsx : `${sourceTsx}\n` }],
  })
}

async function writeComponentFilesAndRegistry(input: {
  projectRoot: string
  componentsRoot: string
  registryPath: string
  primitive: CanvasRegistryPrimitive
  writes: Array<{ filePath: string; source: string }>
}): Promise<CanvasComponentCreateResponse> {
  for (const write of input.writes) {
    const relative = path.relative(input.componentsRoot, write.filePath)
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return { ok: false, status: 403, code: "bad-path", error: "Component files must stay under components/." }
    }
    try {
      await fs.access(write.filePath)
      return {
        ok: false,
        status: 409,
        code: "already-exists",
        error: `Component file already exists: ${path.relative(input.projectRoot, write.filePath)}`,
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
        return {
          ok: false,
          status: 500,
          code: "access-failed",
          error: error instanceof Error ? error.message : "Failed to inspect component file.",
        }
      }
    }
  }

  let registryRaw = '{ "ui": [], "page": [] }\n'
  try {
    registryRaw = await fs.readFile(input.registryPath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      return {
        ok: false,
        status: 500,
        code: "read-failed",
        error: error instanceof Error ? error.message : "Failed to read registry.json.",
      }
    }
  }
  let registry: Record<string, unknown>
  try {
    registry = JSON.parse(registryRaw)
  } catch (error) {
    return {
      ok: false,
      status: 400,
      code: "parse-error",
      error: error instanceof Error ? error.message : "Failed to parse registry.json.",
    }
  }
  const parsed = parseCanvasRegistry(registry)
  if (parsed.primitives.some((primitive) => primitive.id === input.primitive.id)) {
    return {
      ok: false,
      status: 409,
      code: "already-exists",
      error: `Registry entry already exists: ${input.primitive.id}`,
    }
  }

  const ui = Array.isArray(registry.ui) ? [...registry.ui] : []
  ui.push(toRegistryEntry(input.primitive))
  registry = { ...registry, ui, page: Array.isArray(registry.page) ? registry.page : [] }

  await fs.mkdir(input.componentsRoot, { recursive: true })
  const writtenFiles: Array<{ filePath: string; mtimeMs: number }> = []
  const tmpFiles: string[] = []
  try {
    for (const write of input.writes) {
      const tmpPath = `${write.filePath}.${process.pid}.${Date.now()}.tmp`
      tmpFiles.push(tmpPath)
      await fs.writeFile(tmpPath, write.source, "utf8")
      await fs.rename(tmpPath, write.filePath)
      const stat = await fs.stat(write.filePath)
      writtenFiles.push({
        filePath: path.relative(input.projectRoot, write.filePath),
        mtimeMs: stat.mtimeMs,
      })
    }
    const registryTmpPath = `${input.registryPath}.${process.pid}.${Date.now()}.tmp`
    tmpFiles.push(registryTmpPath)
    await fs.writeFile(registryTmpPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8")
    await fs.rename(registryTmpPath, input.registryPath)
  } catch (error) {
    await Promise.all(tmpFiles.map((tmpPath) => fs.rm(tmpPath, { force: true }).catch(() => undefined)))
    return {
      ok: false,
      status: 500,
      code: "write-failed",
      error: error instanceof Error ? error.message : "Failed to write component files.",
    }
  }

  return {
    ok: true,
    projectId: path.basename(input.projectRoot),
    primitive: input.primitive,
    files: writtenFiles,
  }
}

function normalizeComponentName(input: unknown): string | null {
  const raw = typeof input === "string" ? input.trim() : ""
  const words = raw.match(/[A-Za-z0-9]+/g)
  if (!words || words.length === 0) return null
  const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("")
  return /^[A-Za-z][A-Za-z0-9]*$/.test(name) ? name : null
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}

function ensureDataComponent(sourceHtml: string, componentSlug?: string): string {
  if (!componentSlug || /\sdata-component\s*=/.test(sourceHtml)) {
    return sourceHtml.endsWith("\n") ? sourceHtml : `${sourceHtml}\n`
  }
  return sourceHtml.replace(/<([A-Za-z][^\s/>]*)([^>]*)>/, `<$1 data-component="${componentSlug}"$2>`).trimEnd() + "\n"
}

function toRegistryEntry(primitive: CanvasRegistryPrimitive): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(primitive).filter(([, value]) => value !== undefined && value !== "")
  )
}
