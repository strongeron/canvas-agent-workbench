/**
 * Paper MCP bridge helpers.
 *
 * This file defines a typed client interface for Paper MCP tools
 * and a few safe helpers to turn a Paper selection into a gallery entry.
 *
 * Note: The actual MCP client must be provided by the host app/runtime.
 */

import type { GalleryEntry, ComponentStatus } from "../types"

export type PaperJSXFormat = "tailwind" | "inline-styles"

export interface PaperMcpClient {
  getBasicInfo: () => Promise<PaperBasicInfo | Record<string, unknown>>
  getSelection: () => Promise<PaperSelection | Record<string, unknown>>
  getNodeInfo: (nodeId: string) => Promise<PaperNodeInfo | Record<string, unknown>>
  getChildren: (nodeId: string) => Promise<PaperChildren | Record<string, unknown>>
  getScreenshot: (nodeId: string) => Promise<PaperScreenshot | string | Record<string, unknown>>
  getJSX: (
    nodeId: string,
    format?: PaperJSXFormat
  ) => Promise<PaperJSXResult | string | Record<string, unknown>>
  getComputedStyles: (nodeIds: string[]) => Promise<PaperComputedStyles | Record<string, unknown>>
  getFillImage: (nodeId: string) => Promise<PaperFillImage | Record<string, unknown>>
}

export interface PaperBasicInfo {
  fileName?: string
  pageName?: string
  nodeCount?: number
  artboards?: Array<{ id: string; name?: string; width?: number; height?: number }>
}

export interface PaperNodeSummary {
  id: string
  name?: string
  type?: string
  width?: number
  height?: number
  artboardId?: string
}

export interface PaperSelection {
  nodes?: PaperNodeSummary[]
  selection?: PaperNodeSummary[]
  [key: string]: unknown
}

export interface PaperNodeInfo extends PaperNodeSummary {
  parentId?: string
  children?: string[]
  text?: string
  visible?: boolean
  locked?: boolean
  [key: string]: unknown
}

export interface PaperChildren {
  nodes?: PaperNodeSummary[]
  [key: string]: unknown
}

export interface PaperScreenshot {
  pngBase64?: string
  mimeType?: string
  [key: string]: unknown
}

export interface PaperJSXResult {
  jsx?: string
  code?: string
  format?: PaperJSXFormat
  [key: string]: unknown
}

export interface PaperComputedStyles {
  [nodeId: string]: Record<string, unknown>
}

export interface PaperFillImage {
  base64?: string
  mimeType?: string
  [key: string]: unknown
}

export interface PaperImportResult {
  nodeId: string
  name: string
  jsx: string
  format: PaperJSXFormat
  width?: number
  height?: number
  artboardId?: string
}

export interface PaperGalleryEntryOptions {
  id: string
  name: string
  importPath: string
  category?: string
  status?: ComponentStatus
  variantName?: string
  description?: string
}

export interface PaperFileNameOptions {
  componentName: string
  fileName?: string
  entryName?: string
}

export function getSelectedPaperNodeId(selection: PaperSelection | Record<string, unknown>): string | null {
  const anySelection = selection as PaperSelection
  const nodes = anySelection.nodes ?? anySelection.selection
  if (Array.isArray(nodes) && nodes.length > 0) {
    return typeof nodes[0]?.id === "string" ? nodes[0].id : null
  }
  const fallbackId = (anySelection as { id?: string }).id
  return typeof fallbackId === "string" ? fallbackId : null
}

export function getPaperJsxString(result: PaperJSXResult | string | Record<string, unknown>): string {
  if (typeof result === "string") return result
  const anyResult = result as PaperJSXResult
  if (typeof anyResult.jsx === "string") return anyResult.jsx
  if (typeof anyResult.code === "string") return anyResult.code
  return ""
}

export async function importPaperSelection(
  client: PaperMcpClient,
  options?: { format?: PaperJSXFormat; fallbackName?: string }
): Promise<PaperImportResult> {
  const format = options?.format ?? "tailwind"
  const selection = await client.getSelection()
  const nodeId = getSelectedPaperNodeId(selection)
  if (!nodeId) {
    throw new Error("No Paper node selected.")
  }

  const nodeInfo = await client.getNodeInfo(nodeId)
  const jsxResult = await client.getJSX(nodeId, format)
  const jsx = getPaperJsxString(jsxResult)
  const name =
    (nodeInfo as PaperNodeInfo)?.name ||
    options?.fallbackName ||
    `PaperNode-${nodeId.slice(0, 6)}`

  return {
    nodeId,
    name,
    jsx,
    format,
    width: (nodeInfo as PaperNodeInfo)?.width,
    height: (nodeInfo as PaperNodeInfo)?.height,
    artboardId: (nodeInfo as PaperNodeInfo)?.artboardId,
  }
}

export function createPaperGalleryEntry({
  id,
  name,
  importPath,
  category = "Paper",
  status = "wip",
  variantName = "Imported",
  description = "Imported from Paper MCP",
}: PaperGalleryEntryOptions): GalleryEntry {
  return {
    id,
    name,
    category,
    importPath,
    layoutSize: "medium",
    variants: [
      {
        name: variantName,
        description,
        props: {},
        status,
        category: "variant",
        aiMeta: {
          generatedAt: new Date().toISOString(),
          prompt: "Paper MCP import",
          iteration: 1,
        },
      },
    ],
  }
}

export function toPascalCase(value: string) {
  const cleaned = value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
  if (!cleaned) return "PaperComponent"
  return cleaned
    .split(/\s+/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

export function slugify(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
  return cleaned || "paper-component"
}

export function formatPaperComponentSource(jsx: string, componentName: string) {
  const trimmed = jsx.trim()
  if (!trimmed) {
    return `export default function ${componentName}() {\n  return null\n}\n`
  }

  const hasExport =
    /\bexport\s+default\b/.test(trimmed) || /\bexport\s+function\b/.test(trimmed)
  const hasImport = /^\s*import\s+/m.test(trimmed)

  if (hasExport || hasImport) {
    return `${trimmed}\n`
  }

  if (trimmed.startsWith("<")) {
    return `export default function ${componentName}() {\n  return (\n${trimmed}\n  )\n}\n`
  }

  return `${trimmed}\n`
}

export function formatPaperGalleryEntrySource(
  entry: GalleryEntry,
  options?: { exportName?: string; coreImportPath?: string }
) {
  const exportName = options?.exportName ?? `${slugify(entry.name).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Entry`
  const coreImportPath = options?.coreImportPath ?? "../../../core"
  const body = JSON.stringify(entry, null, 2)
  return `import type { GalleryEntry } from "${coreImportPath}"\n\nexport const ${exportName}: GalleryEntry = ${body}\n`
}
