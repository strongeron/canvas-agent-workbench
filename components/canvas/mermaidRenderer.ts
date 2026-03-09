import mermaid from "mermaid"

import type { CanvasMermaidTheme } from "../../types/canvas"

let initialized = false

function ensureMermaidInitialized() {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "default",
    suppressErrorRendering: true,
  })
  initialized = true
}

function applyThemeDirective(source: string, theme: CanvasMermaidTheme | undefined) {
  const trimmed = source.trim()
  if (!trimmed) return trimmed
  if (!theme || theme === "default") return trimmed
  if (trimmed.startsWith("%%{init:")) return trimmed
  return `%%{init: {'theme':'${theme}'}}%%\n${trimmed}`
}

export async function renderMermaidSvg(
  source: string,
  options?: {
    theme?: CanvasMermaidTheme
  }
) {
  ensureMermaidInitialized()
  const graphSource = applyThemeDirective(source, options?.theme)
  await mermaid.parse(graphSource, { suppressErrors: false })
  const id = `canvas-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const rendered = await mermaid.render(id, graphSource)
  return rendered.svg
}
