import { promises as fs } from "node:fs"
import path from "node:path"

import { listCanvasHtmlSlots } from "../../utils/canvasHtmlEditor"
import {
  parseCanvasRegistry,
  type CanvasRegistryPrimitive,
  type CanvasRegistrySlot,
} from "../../utils/canvasRegistry"

interface CanvasComponentCreateBody {
  projectId?: unknown
  name?: unknown
  format?: unknown
  sourceHtml?: unknown
  sourceCss?: unknown
  sourceTsx?: unknown
  description?: unknown
  /**
   * Collision policy.
   *
   * Default (`false`/omitted): the native file-backed-on-create path. If the
   * target `<slug>.html` (or `.tsx`/`.css`) already exists OR `primitive/<slug>`
   * is already in the registry, the slug is uniquified — the name suffix is
   * advanced (`-2`, `-3`, …) until BOTH the on-disk filename and the registry
   * id are simultaneously free at the same suffix, then allocated as a pair.
   * This guarantees file-backed-on-create never 409s on a name clash.
   *
   * Opt-out (`true`): legacy behavior for non-native callers — return HTTP 409
   * `already-exists` on the first collision instead of uniquifying.
   */
  failOnExisting?: unknown
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

  const baseComponentName = normalizeComponentName(body.name)
  if (!baseComponentName) {
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
  const failOnExisting = body.failOnExisting === true

  // Validate the base slug as a single path segment before it ever reaches a
  // path join (defense-in-depth alongside the traversal guard in
  // writeComponentFilesAndRegistry). normalizeComponentName already strips
  // separators, but reject defensively rather than 500 if that ever changes.
  const baseSlug = toKebabCase(baseComponentName)
  const segmentError = validateSingleSegment(baseSlug) ?? validateSingleSegment(baseComponentName)
  if (segmentError) {
    return {
      ok: false,
      status: 403,
      code: "bad-path",
      error: segmentError,
    }
  }

  // Read+parse the registry once up-front: the uniquifier needs it to pair the
  // chosen filename suffix with a free `primitive/<slug>` id, and
  // writeComponentFilesAndRegistry needs it to append the new entry.
  const registryState = await loadRegistry(registryPath)
  if (!registryState.ok) return registryState

  const resolved = await resolveComponentIdentity({
    baseComponentName,
    format,
    componentsRoot,
    existingPrimitiveIds: registryState.primitiveIds,
    failOnExisting,
    projectRoot,
  })
  if (!resolved.ok) return resolved
  const componentName = resolved.componentName
  const componentSlug = resolved.slug

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
      id: `primitive/${componentSlug}`,
      displayName: componentName,
      category: "ui",
      kind: "html",
      filePath: htmlRelative,
      ...(cssSource ? { cssPath: cssRelative } : {}),
      componentSlug,
      ...(description ? { description } : {}),
      slots: extractRegistrySlotsFromHtml(sourceHtml),
    }
    const writes = [{ filePath: htmlPath, source: ensureDataComponent(sourceHtml, primitive.componentSlug) }]
    if (cssSource) writes.push({ filePath: cssPath, source: cssSource.endsWith("\n") ? cssSource : `${cssSource}\n` })
    return writeComponentFilesAndRegistry({
      projectRoot,
      componentsRoot,
      registryPath,
      primitive,
      writes,
      registry: registryState.registry,
      existingPrimitiveIds: registryState.primitiveIds,
    })
  }

  const sourceTsx = typeof body.sourceTsx === "string" ? body.sourceTsx.trim() : ""
  if (!sourceTsx) {
    return { ok: false, status: 400, code: "bad-input", error: "sourceTsx is required." }
  }
  const tsxPath = path.join(componentsRoot, `${componentName}.tsx`)
  const primitive: CanvasRegistryPrimitive = {
    id: `primitive/${componentSlug}`,
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
    registry: registryState.registry,
    existingPrimitiveIds: registryState.primitiveIds,
  })
}

async function writeComponentFilesAndRegistry(input: {
  projectRoot: string
  componentsRoot: string
  registryPath: string
  primitive: CanvasRegistryPrimitive
  writes: Array<{ filePath: string; source: string }>
  registry: Record<string, unknown>
  existingPrimitiveIds: Set<string>
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

  // The registry was already read+parsed up-front (resolveComponentIdentity
  // either uniquified past every existing id or, when failOnExisting=true,
  // returned 409 before reaching here). This residual check is a safety net.
  let registry = input.registry
  if (input.existingPrimitiveIds.has(input.primitive.id)) {
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

/**
 * Reject any value that is not safe to use as a single filesystem path
 * segment. Returns an error message on rejection, or `null` when the value is
 * a clean single segment. This runs before any `path.join`, in addition to the
 * traversal guard in writeComponentFilesAndRegistry.
 */
export function validateSingleSegment(value: string): string | null {
  if (!value) {
    return "Component slug must not be empty."
  }
  if (value.includes("/") || value.includes("\\")) {
    return "Component slug must be a single path segment (no slashes)."
  }
  if (value.includes("\0")) {
    return "Component slug must not contain null bytes."
  }
  if (value === "." || value === ".." || value.includes("..")) {
    return "Component slug must not contain path traversal segments."
  }
  if (value.startsWith(".")) {
    return "Component slug must not start with a dot."
  }
  return null
}

type LoadRegistryResult =
  | { ok: true; registry: Record<string, unknown>; primitiveIds: Set<string> }
  | { ok: false; status: number; code: string; error: string }

/**
 * Read and parse registry.json once. Both the uniquifier and the writer share
 * this snapshot so the chosen filename suffix and the registry id stay paired
 * (they cannot diverge between two independent reads).
 */
async function loadRegistry(registryPath: string): Promise<LoadRegistryResult> {
  let registryRaw = '{ "ui": [], "page": [] }\n'
  try {
    registryRaw = await fs.readFile(registryPath, "utf8")
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
  let registry: unknown
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
  return {
    ok: true,
    registry: (registry && typeof registry === "object" ? registry : {}) as Record<string, unknown>,
    primitiveIds: new Set(parsed.primitives.map((primitive) => primitive.id)),
  }
}

type ResolveIdentityResult =
  | { ok: true; componentName: string; slug: string }
  | { ok: false; status: number; code: string; error: string }

/**
 * Resolve a `(componentName, primitive id, filename)` triple that is free as a
 * unit. The base name suffix is advanced (`Card`, `Card2`, `Card3`, …) so the
 * derived filename (`Card.html` → `Card2.html`) and the derived registry id
 * (`primitive/card` → `primitive/card-3`) always share the same suffix and are
 * allocated together — we never accept a free filename whose paired registry
 * id is taken, or vice versa.
 *
 * When `failOnExisting` is true the first collision (file OR registry id)
 * returns 409 instead, preserving the legacy opt-out for non-native callers.
 */
async function resolveComponentIdentity(input: {
  baseComponentName: string
  format: "html" | "tsx"
  componentsRoot: string
  existingPrimitiveIds: Set<string>
  failOnExisting: boolean
  projectRoot: string
}): Promise<ResolveIdentityResult> {
  const ext = input.format === "tsx" ? "tsx" : "html"

  const baseSlug = toKebabCase(input.baseComponentName)

  // Suffix 1 is the bare base name. Suffix N≥2 appends `-N` to the slug (the
  // documented `<slug>-2`, `<slug>-3` sequence) and `N` to the PascalCase
  // file/component name; both carry the same numeric suffix so the on-disk
  // filename and the `primitive/<slug>` id are always allocated as a pair.
  for (let suffix = 1; suffix < 10000; suffix += 1) {
    const componentName = suffix === 1 ? input.baseComponentName : `${input.baseComponentName}${suffix}`
    const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`
    const primitiveId = `primitive/${slug}`
    const htmlPath = path.join(input.componentsRoot, `${componentName}.${ext}`)
    // For HTML components a sibling `<name>.css` may also be written; treat the
    // CSS path as part of the same allocation so a stray `.css` does not let a
    // later create reuse a "free" `.html` slug.
    const cssPath = path.join(input.componentsRoot, `${componentName}.css`)

    const idTaken = input.existingPrimitiveIds.has(primitiveId)
    let fileTaken: boolean
    try {
      fileTaken = (await pathExists(htmlPath)) || (ext === "html" && (await pathExists(cssPath)))
    } catch (error) {
      return {
        ok: false,
        status: 500,
        code: "access-failed",
        error: error instanceof Error ? error.message : "Failed to inspect component file.",
      }
    }

    if (!idTaken && !fileTaken) {
      return { ok: true, componentName, slug }
    }

    if (input.failOnExisting) {
      // Opt-out: behave exactly as before — 409 on the first collision rather
      // than uniquifying. The message mirrors the legacy file/registry shape.
      return {
        ok: false,
        status: 409,
        code: "already-exists",
        error: fileTaken
          ? `Component file already exists: ${path.relative(input.projectRoot, htmlPath)}`
          : `Registry entry already exists: ${primitiveId}`,
      }
    }
  }

  return {
    ok: false,
    status: 409,
    code: "already-exists",
    error: "Unable to allocate a unique component slug after 10000 attempts.",
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return false
    }
    throw error
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

function extractRegistrySlotsFromHtml(sourceHtml: string): CanvasRegistrySlot[] | undefined {
  const slots = listCanvasHtmlSlots(sourceHtml, { sourceId: "registry-slot-scan" }).map((slot) => ({
    name: slot.name,
    kind: slot.kind,
    accepts: slot.accepts,
    tag: slot.tag,
  }))
  return slots.length > 0 ? slots : undefined
}
