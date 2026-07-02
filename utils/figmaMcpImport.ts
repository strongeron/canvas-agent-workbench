export interface FigmaMcpInvokeResult {
  result?: unknown
}

export interface FigmaMcpImportArtifacts {
  sourceReact?: string
  screenshotSrc?: string
  contextText?: string
}

export interface FigmaUrlParts {
  fileKey?: string
  nodeId?: string
}

export interface FigmaToolArgDescriptor {
  inputSchema?: Record<string, unknown>
}

export function assertValidFigmaUrl(figmaUrl: string) {
  let parsed: URL
  try {
    parsed = new URL(figmaUrl)
  } catch {
    throw new Error("Paste a valid Figma frame or layer URL.")
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Figma URL must use http or https.")
  }
  const host = parsed.hostname.toLowerCase()
  const isFigmaHost = host === "figma.com" || host.endsWith(".figma.com")
  if (!isFigmaHost) {
    throw new Error("Paste a figma.com frame or layer URL.")
  }
  const { fileKey, nodeId } = parseFigmaUrlParts(figmaUrl)
  if (!fileKey || !nodeId) {
    throw new Error("Paste a Figma frame or layer URL with a node-id.")
  }
}

export function parseFigmaUrlParts(figmaUrl: string): FigmaUrlParts {
  try {
    const parsed = new URL(figmaUrl)
    const pathParts = parsed.pathname.split("/").filter(Boolean)
    const fileTypeIndex = pathParts.findIndex((part) =>
      ["design", "file", "proto", "board", "slides"].includes(part)
    )
    const fileKey =
      fileTypeIndex >= 0 && pathParts[fileTypeIndex + 1] ? pathParts[fileTypeIndex + 1] : undefined
    const rawNodeId = parsed.searchParams.get("node-id") || parsed.searchParams.get("node_id") || undefined
    return {
      fileKey,
      nodeId: rawNodeId?.replace("-", ":"),
    }
  } catch {
    return {}
  }
}

function getSchemaProperties(tool?: FigmaToolArgDescriptor) {
  const properties = tool?.inputSchema?.properties
  return properties && typeof properties === "object" && !Array.isArray(properties)
    ? (properties as Record<string, unknown>)
    : {}
}

function schemaTypeFor(property: unknown) {
  return property && typeof property === "object" && !Array.isArray(property)
    ? (property as Record<string, unknown>).type
    : undefined
}

function schemaValueFor(property: unknown, value: string) {
  return schemaTypeFor(property) === "array" ? [value] : value
}

export function buildFigmaToolArgs(tool: FigmaToolArgDescriptor | undefined, figmaUrl: string) {
  const properties = getSchemaProperties(tool)
  const keys = Object.keys(properties)
  const parts = parseFigmaUrlParts(figmaUrl)

  if (keys.length === 0) {
    return { url: figmaUrl }
  }

  const args: Record<string, string | string[]> = {}
  for (const key of keys) {
    const lower = key.toLowerCase()
    const property = properties[key]
    if (lower === "url" || lower === "figmaurl" || lower === "figma_url" || lower === "link") {
      args[key] = figmaUrl
    } else if ((lower === "nodeid" || lower === "node_id") && parts.nodeId) {
      args[key] = parts.nodeId
    } else if ((lower === "filekey" || lower === "file_key" || lower === "key") && parts.fileKey) {
      args[key] = parts.fileKey
    } else if (lower === "clientframeworks") {
      args[key] = schemaValueFor(property, "React")
    } else if (lower === "clientlanguages") {
      args[key] = schemaValueFor(property, "TypeScript")
    }
  }

  return Object.keys(args).length > 0 ? args : { url: figmaUrl }
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, out)
    return out
  }
  if (!value || typeof value !== "object") return out

  const record = value as Record<string, unknown>
  for (const key of ["text", "code", "source", "url", "src", "uri"]) {
    collectStrings(record[key], out)
  }
  collectStrings(record.content, out)
  collectStrings(record.artifacts, out)
  collectStrings(record.assets, out)
  return out
}

function collectImages(value: unknown): string[] {
  if (!value || typeof value !== "object") return []
  if (Array.isArray(value)) return value.flatMap((entry) => collectImages(entry))

  const record = value as Record<string, unknown>
  const direct =
    typeof record.url === "string"
      ? record.url
      : typeof record.src === "string"
        ? record.src
        : typeof record.imageUrl === "string"
          ? record.imageUrl
          : typeof record.image_url === "string"
            ? record.image_url
            : ""
  if (isLikelyImageSource(direct)) return [direct]

  if (record.type === "image" && typeof record.data === "string") {
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : "image/png"
    return [`data:${mimeType};base64,${record.data}`]
  }

  return [...collectImages(record.content), ...collectImages(record.artifacts), ...collectImages(record.assets)]
}

function isLikelyImageSource(value: string) {
  if (!value) return false
  if (/^(data:image\/|blob:)/i.test(value)) return true
  if (!/^https?:\/\//i.test(value)) return false
  try {
    const parsed = new URL(value)
    const host = parsed.hostname.toLowerCase()
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true
    return /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(value)
  } catch {
    return false
  }
}

function extractFencedCode(text: string): string | undefined {
  const fence = text.match(/```(?:tsx|jsx|typescript|javascript|react|js)?\s*([\s\S]*?)```/i)
  const code = fence?.[1]?.trim()
  if (code && /export\s+default|function\s+\w+|const\s+\w+\s*=|return\s*\(/.test(code)) {
    return code
  }
  return undefined
}

export function extractFigmaMcpArtifacts(results: {
  designContext?: FigmaMcpInvokeResult
  screenshot?: FigmaMcpInvokeResult
  variableDefs?: FigmaMcpInvokeResult
  metadata?: FigmaMcpInvokeResult
  codeConnectMap?: FigmaMcpInvokeResult
}): FigmaMcpImportArtifacts {
  const designStrings = collectStrings(results.designContext?.result)
  const allStrings = [
    ...designStrings,
    ...collectStrings(results.variableDefs?.result),
    ...collectStrings(results.metadata?.result),
    ...collectStrings(results.codeConnectMap?.result),
  ]
  const sourceReact =
    designStrings.map(extractFencedCode).find(Boolean) ||
    designStrings.find((entry) => /export\s+default\s+function|export\s+default\s+\w+/.test(entry))?.trim()
  const screenshotSrc =
    collectImages(results.screenshot?.result)[0] ||
    collectStrings(results.screenshot?.result).find((entry) =>
      isLikelyImageSource(entry)
    )

  return {
    sourceReact,
    screenshotSrc,
    contextText: allStrings.filter(Boolean).join("\n\n").trim() || undefined,
  }
}

export function buildFigmaContextHtml(title: string, contextText: string) {
  const escapedTitle = title.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return map[char] || char
  })
  const escapedContext = contextText.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return map[char] || char
  })
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; background: #ffffff; color: #111827; font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
      main { padding: 20px; }
      h1 { margin: 0 0 14px; font: 600 16px/1.3 system-ui, sans-serif; }
      pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapedTitle}</h1>
      <pre>${escapedContext}</pre>
    </main>
  </body>
</html>`
}
