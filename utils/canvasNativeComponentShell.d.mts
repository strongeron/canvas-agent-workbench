// Ambient types for the JS implementation in `canvasNativeComponentShell.mjs`.
//
// The runtime implementation lives in the `.mjs` (single source of truth so
// the raw-Node MCP server can reach it). This declaration only describes the
// shapes — it contains no logic, so it cannot drift from the implementation.
// The public type aliases are owned by `canvasNativeComponentShell.ts`, which
// re-exports these values with those names.

export interface NativeComponentTemplateDefinition {
  id: string
  label: string
  description: string
  slotSummary: string
  group: "named" | "layout" | "element"
}

export interface NativeComponentShell {
  title: string
  size: { width: number; height: number }
  sourceHtml: string
}

export const NATIVE_COMPONENT_TEMPLATES: NativeComponentTemplateDefinition[]
export const NATIVE_COMPONENT_LAYOUT_PRIMITIVES: string[]
export const NATIVE_COMPONENT_ELEMENT_PARTS: string[]

export function escapeHtmlText(value: unknown): string

export function buildNativeComponentShell(
  templateOrArgs?: string | { template?: string; title?: string },
  maybeTitle?: string
): NativeComponentShell
