import { useEffect, useState, type ReactNode } from "react"

import { renderMermaidSvg } from "./mermaidRenderer"

interface CanvasMarkdownPreviewProps {
  source: string
  title?: string
  background?: string
}

interface MarkdownMermaidBlockProps {
  source: string
}

function MarkdownMermaidBlock({ source }: MarkdownMermaidBlockProps) {
  const [svg, setSvg] = useState("")
  const [error, setError] = useState("")
  const [isRendering, setIsRendering] = useState(false)

  useEffect(() => {
    const trimmed = source.trim()
    if (!trimmed) {
      setSvg("")
      setError("Mermaid block is empty.")
      return
    }

    let cancelled = false
    setIsRendering(true)
    setError("")

    void (async () => {
      try {
        const nextSvg = await renderMermaidSvg(trimmed)
        if (cancelled) return
        setSvg(nextSvg)
        setError("")
      } catch (renderError) {
        if (cancelled) return
        setSvg("")
        setError(
          renderError instanceof Error
            ? renderError.message
            : "Mermaid failed to render in markdown."
        )
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [source])

  return (
    <div className="overflow-hidden rounded-md border border-default bg-white">
      {svg ? (
        <div className="overflow-x-auto p-3" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="flex min-h-[80px] items-center justify-center px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            {isRendering ? "Rendering Mermaid..." : error || "Diagram preview unavailable"}
          </p>
        </div>
      )}
      <div className="border-t border-default bg-surface-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Mermaid
      </div>
    </div>
  )
}

function renderInline(source: string): ReactNode[] {
  const pattern =
    /(\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null = pattern.exec(source)
  let index = 0

  while (match) {
    if (match.index > cursor) {
      nodes.push(source.slice(cursor, match.index))
    }

    const [token, _full, linkLabel, linkHref, codeText, strongText, emText] = match

    if (linkLabel && linkHref) {
      const href = linkHref.trim()
      const safeHref = /^(https?:\/\/|mailto:)/i.test(href) ? href : undefined
      nodes.push(
        <a
          key={`inline-${index}`}
          href={safeHref}
          target={safeHref ? "_blank" : undefined}
          rel={safeHref ? "noreferrer noopener" : undefined}
          className="text-brand-700 underline decoration-brand-400 hover:text-brand-800"
        >
          {linkLabel}
        </a>
      )
    } else if (codeText) {
      nodes.push(
        <code
          key={`inline-${index}`}
          className="rounded bg-surface-100 px-1 py-0.5 font-mono text-[11px] text-foreground"
        >
          {codeText}
        </code>
      )
    } else if (strongText) {
      nodes.push(
        <strong key={`inline-${index}`} className="font-semibold text-foreground">
          {strongText}
        </strong>
      )
    } else if (emText) {
      nodes.push(
        <em key={`inline-${index}`} className="italic text-foreground">
          {emText}
        </em>
      )
    } else {
      nodes.push(token)
    }

    cursor = match.index + token.length
    index += 1
    match = pattern.exec(source)
  }

  if (cursor < source.length) {
    nodes.push(source.slice(cursor))
  }

  return nodes
}

function isBlockBoundary(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return true
  return (
    trimmed.startsWith("```") ||
    /^#{1,6}\s+/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^[-*+]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)
  )
}

function renderMarkdownBlocks(source: string) {
  const lines = source.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const current = lines[i] || ""
    const trimmed = current.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim()
      const languageId = language.toLowerCase().split(/\s+/, 1)[0] || ""
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i] || "")
        i += 1
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i += 1
      }
      const code = codeLines.join("\n")
      if (languageId === "mermaid" || languageId === "mmd") {
        blocks.push(<MarkdownMermaidBlock key={`block-${blocks.length}`} source={code} />)
        continue
      }
      blocks.push(
        <pre
          key={`block-${blocks.length}`}
          className="overflow-x-auto rounded-md border border-default bg-surface-950/95 p-3 text-xs text-surface-50"
        >
          {language ? (
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-surface-300">
              {language}
            </div>
          ) : null}
          <code className="font-mono">{code}</code>
        </pre>
      )
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const className =
        level === 1
          ? "text-xl font-bold text-foreground"
          : level === 2
            ? "text-lg font-semibold text-foreground"
            : level === 3
              ? "text-base font-semibold text-foreground"
              : "text-sm font-semibold text-foreground"
      blocks.push(
        <div key={`block-${blocks.length}`} className={className}>
          {renderInline(text)}
        </div>
      )
      i += 1
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={`block-${blocks.length}`} className="border-default" />)
      i += 1
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test((lines[i] || "").trim())) {
        quoteLines.push((lines[i] || "").replace(/^>\s?/, ""))
        i += 1
      }
      blocks.push(
        <blockquote
          key={`block-${blocks.length}`}
          className="border-l-2 border-brand-300 pl-3 text-sm text-muted-foreground"
        >
          {renderInline(quoteLines.join(" "))}
        </blockquote>
      )
      continue
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+]\s+/.test((lines[i] || "").trim())) {
        items.push((lines[i] || "").trim().replace(/^[-*+]\s+/, ""))
        i += 1
      }
      blocks.push(
        <ul key={`block-${blocks.length}`} className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {items.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] || "").trim())) {
        items.push((lines[i] || "").trim().replace(/^\d+\.\s+/, ""))
        i += 1
      }
      blocks.push(
        <ol key={`block-${blocks.length}`} className="list-decimal space-y-1 pl-5 text-sm text-foreground">
          {items.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    const paragraphLines: string[] = [current]
    i += 1
    while (i < lines.length && !isBlockBoundary(lines[i] || "")) {
      paragraphLines.push(lines[i] || "")
      i += 1
    }
    blocks.push(
      <p key={`block-${blocks.length}`} className="text-sm leading-6 text-foreground">
        {renderInline(paragraphLines.join(" "))}
      </p>
    )
  }

  return blocks
}

export function CanvasMarkdownPreview({ source, title, background }: CanvasMarkdownPreviewProps) {
  if (!source.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        Add Markdown content to render.
      </div>
    )
  }

  return (
    <div
      className="relative h-full w-full overflow-auto"
      style={background ? { background } : undefined}
    >
      <div className="space-y-3 p-3">{renderMarkdownBlocks(source)}</div>
      <div className="pointer-events-none absolute right-2 top-2 rounded bg-surface-900/80 px-2 py-1 text-[10px] text-white">
        Markdown{title ? " · node" : ""}
      </div>
    </div>
  )
}
