// Typed re-export of the single shell-builder implementation.
//
// The implementation lives in `canvasNativeComponentShell.mjs` (plain JS) so
// that the canvas MCP server (`bin/canvas-mcp-server`, raw `node`) can reach it
// through `utils/canvasAgentOperations.mjs` — raw Node cannot import a `.ts`
// module. This file adds TypeScript types only and re-exports; it never
// re-implements the template strings, so the UI and agent paths cannot drift.
// `.ts` importing `.mjs` already resolves in this repo (see
// `vite.config.ts` -> `canvasAgentOperations.mjs`).

import {
  buildNativeComponentShell as buildNativeComponentShellImpl,
  escapeHtmlText as escapeHtmlTextImpl,
  NATIVE_COMPONENT_TEMPLATES as NATIVE_COMPONENT_TEMPLATES_IMPL,
  NATIVE_COMPONENT_LAYOUT_PRIMITIVES as NATIVE_COMPONENT_LAYOUT_PRIMITIVES_IMPL,
  NATIVE_COMPONENT_ELEMENT_PARTS as NATIVE_COMPONENT_ELEMENT_PARTS_IMPL,
} from "./canvasNativeComponentShell.mjs"

export type NativeComponentNamedTemplate =
  | "blank"
  | "card"
  | "section"
  | "hero"
  | "media-object"

export type NativeComponentLayoutPrimitive =
  | "stack"
  | "row"
  | "grid"
  | "split"
  | "center"
  | "cover"
  | "frame"

export type NativeComponentElementPart =
  | "div"
  | "section"
  | "header"
  | "footer"
  | "figure"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "ul"
  | "ol"
  | "li"
  | "a"
  | "button"
  | "img"
  | "svg"
  | "video"

export type NativeComponentTemplate =
  | NativeComponentNamedTemplate
  | NativeComponentLayoutPrimitive
  | NativeComponentElementPart

export type NativeComponentTemplateGroup = "named" | "layout" | "element"

export interface NativeComponentTemplateDefinition {
  id: NativeComponentTemplate
  label: string
  description: string
  slotSummary: string
  group: NativeComponentTemplateGroup
}

export interface NativeComponentShell {
  title: string
  size: { width: number; height: number }
  sourceHtml: string
}

export const NATIVE_COMPONENT_TEMPLATES =
  NATIVE_COMPONENT_TEMPLATES_IMPL as NativeComponentTemplateDefinition[]

export const NATIVE_COMPONENT_LAYOUT_PRIMITIVES =
  NATIVE_COMPONENT_LAYOUT_PRIMITIVES_IMPL as NativeComponentLayoutPrimitive[]

export const NATIVE_COMPONENT_ELEMENT_PARTS =
  NATIVE_COMPONENT_ELEMENT_PARTS_IMPL as NativeComponentElementPart[]

export function escapeHtmlText(value: string): string {
  return escapeHtmlTextImpl(value) as string
}

// Accepts BOTH call shapes so existing callers keep working unchanged:
//  - positional (UI):    buildNativeComponentShell(template, title)
//  - object form (agent): buildNativeComponentShell({ template, title })
// (A single union signature is used rather than TS overloads because the
// repo's flat ESLint config enables core `no-redeclare`, which flags overload
// signature declarations.)
export function buildNativeComponentShell(
  templateOrArgs?:
    | NativeComponentTemplate
    | { template?: NativeComponentTemplate; title?: string },
  maybeTitle?: string
): NativeComponentShell {
  return buildNativeComponentShellImpl(
    templateOrArgs as never,
    maybeTitle
  ) as NativeComponentShell
}
