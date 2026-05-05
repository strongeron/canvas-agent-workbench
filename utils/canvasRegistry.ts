export type CanvasRegistryCategory = "ui" | "page"

export interface CanvasRegistryPrimitive {
  id: string
  displayName: string
  category: CanvasRegistryCategory
  filePath?: string
  importName?: string
  snippet?: string
  description?: string
}

export interface CanvasRegistryParseResult {
  primitives: CanvasRegistryPrimitive[]
  warnings: string[]
}

export function parseCanvasRegistry(raw: unknown): CanvasRegistryParseResult {
  const primitives: CanvasRegistryPrimitive[] = []
  const warnings: string[] = []
  if (!raw || typeof raw !== "object") {
    warnings.push("Registry is not an object.")
    return { primitives, warnings }
  }
  const root = raw as Record<string, unknown>
  for (const category of ["ui", "page"] as const) {
    const list = root[category]
    if (list === undefined) continue
    if (!Array.isArray(list)) {
      warnings.push(`"${category}" entry is not an array.`)
      continue
    }
    for (const entry of list) {
      const parsed = parseEntry(entry, category, warnings)
      if (parsed) primitives.push(parsed)
    }
  }
  return { primitives, warnings }
}

function parseEntry(
  entry: unknown,
  category: CanvasRegistryCategory,
  warnings: string[]
): CanvasRegistryPrimitive | null {
  if (typeof entry === "string") {
    if (!entry.trim()) return null
    return {
      id: entry,
      displayName: deriveDisplayName(entry),
      category,
    }
  }
  if (!entry || typeof entry !== "object") {
    warnings.push(`Skipping non-object entry in "${category}".`)
    return null
  }
  const value = entry as Record<string, unknown>
  const id = typeof value.id === "string" ? value.id.trim() : ""
  if (!id) {
    warnings.push(`Skipping entry missing "id" in "${category}".`)
    return null
  }
  const displayName =
    typeof value.displayName === "string" && value.displayName.trim()
      ? value.displayName.trim()
      : deriveDisplayName(id)
  return {
    id,
    displayName,
    category,
    filePath: typeof value.filePath === "string" ? value.filePath : undefined,
    importName: typeof value.importName === "string" ? value.importName : undefined,
    snippet: typeof value.snippet === "string" ? value.snippet : undefined,
    description: typeof value.description === "string" ? value.description : undefined,
  }
}

function deriveDisplayName(id: string): string {
  const tail = id.split("/").pop() || id
  return tail.charAt(0).toUpperCase() + tail.slice(1)
}

export function buildPrimitiveSnippet(primitive: CanvasRegistryPrimitive): string {
  if (primitive.snippet) return wrapSnippet(primitive)
  if (primitive.importName && primitive.filePath) {
    return wrapSnippet({
      ...primitive,
      snippet: `<${primitive.importName} />`,
    })
  }
  return `export default function Preview() {\n  return <div>${escapeForJsx(primitive.displayName)}</div>\n}\n`
}

function wrapSnippet(primitive: CanvasRegistryPrimitive): string {
  const importPath = resolveImportPath(primitive)
  const importLine = primitive.importName && importPath
    ? `import { ${primitive.importName} } from "${importPath}"\n`
    : ""
  const snippet = primitive.snippet || `<${primitive.importName ?? "div"} />`
  return `${importLine}\nexport default function Preview() {\n  return (\n    ${snippet}\n  )\n}\n`
}

function resolveImportPath(primitive: CanvasRegistryPrimitive): string | null {
  if (!primitive.filePath) return null
  return `../../projects/design-system-foundation/${primitive.filePath.replace(/\.tsx?$/, "")}`
}

function escapeForJsx(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;")
}
