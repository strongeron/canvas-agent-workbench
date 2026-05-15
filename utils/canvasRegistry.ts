export type CanvasRegistryCategory = "ui" | "page"

export interface CanvasRegistryPrimitive {
  id: string
  displayName: string
  category: CanvasRegistryCategory
  kind: "html" | "tsx"
  filePath?: string
  importName?: string
  cssPath?: string
  componentSlug?: string
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
      kind: "tsx",
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
  const kind = value.kind === "html" ? "html" : "tsx"
  return {
    id,
    displayName,
    category,
    kind,
    filePath: typeof value.filePath === "string" ? value.filePath : undefined,
    importName: typeof value.importName === "string" ? value.importName : undefined,
    cssPath: typeof value.cssPath === "string" ? value.cssPath : undefined,
    componentSlug: typeof value.componentSlug === "string" ? value.componentSlug : undefined,
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

// Tag-name shape the structural writer accepts (it re-validates server-side;
// this is just to pick a sane candidate). Kept local so canvasRegistry does
// not couple to the AST-writer internals.
const PRIMITIVE_TAG_NAME_RE = /^[A-Za-z][A-Za-z0-9_.-]*$/

/**
 * The single JSX expression to splice as a child via `insertChild`. Unlike
 * `buildPrimitiveSnippet` (which emits a whole `export default` module for a
 * standalone preview node), this returns *just* the element so it parses as
 * one JSX expression. No import is emitted — `insertChild` cannot add imports;
 * dropping into a file that doesn't already import the component surfaces a
 * recompile error (same constraint as the property panel's manual insert).
 */
export function buildPrimitiveChildSource(primitive: CanvasRegistryPrimitive): string {
  const snippet = primitive.snippet?.trim()
  if (snippet) return snippet
  if (primitive.importName) return `<${primitive.importName} />`
  return `<div>${escapeForJsx(primitive.displayName)}</div>`
}

/**
 * Wrapper tag for a leaf-target `wrapSelection` drop. `wrapSelection` only
 * carries a tag name, so the primitive's props/children are intentionally
 * not represented — the leaf is wrapped in the primitive's root element.
 */
export function derivePrimitiveWrapperTag(primitive: CanvasRegistryPrimitive): string {
  if (primitive.importName && PRIMITIVE_TAG_NAME_RE.test(primitive.importName)) {
    return primitive.importName
  }
  const fromSnippet = primitive.snippet?.match(/^\s*<\s*([A-Za-z][A-Za-z0-9_.-]*)/)?.[1]
  if (fromSnippet && PRIMITIVE_TAG_NAME_RE.test(fromSnippet)) return fromSnippet
  return "div"
}

function resolveImportPath(primitive: CanvasRegistryPrimitive): string | null {
  if (!primitive.filePath) return null
  return `../../projects/design-system-foundation/${primitive.filePath.replace(/\.tsx?$/, "")}`
}

function escapeForJsx(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;")
}
