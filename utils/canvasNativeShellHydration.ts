import {
  injectCanvasHtmlElementIds,
  listCanvasHtmlSlots,
  writeCanvasHtmlNode,
} from "./canvasHtmlEditor"

interface HydrateNativeComponentShellInput {
  sourceHtml: string
  sourceId: string
  values: Record<string, unknown>
}

function pickText(values: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = values[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function applyText(
  sourceHtml: string,
  sourceId: string,
  canvasId: string,
  value: string | null
): string {
  if (!value) return sourceHtml
  const result = writeCanvasHtmlNode(
    sourceHtml,
    canvasId,
    [{ type: "setTextContent", value }],
    { sourceId }
  )
  return result.ok ? result.source : sourceHtml
}

function applyAttribute(
  sourceHtml: string,
  sourceId: string,
  canvasId: string,
  attrName: string,
  value: string | null
): string {
  if (!value) return sourceHtml
  const result = writeCanvasHtmlNode(
    sourceHtml,
    canvasId,
    [{ type: "setAttribute", attrName, value }],
    { sourceId }
  )
  return result.ok ? result.source : sourceHtml
}

export function hydrateNativeComponentShellFromProps(
  input: HydrateNativeComponentShellInput
): string {
  const { sourceId, values } = input
  let nextSource = input.sourceHtml
  const slots = listCanvasHtmlSlots(nextSource, { sourceId })

  const slotByName = (name: string) => slots.find((slot) => slot.name === name)

  const titleText = pickText(values, ["title", "heading", "headline", "name"])
  const eyebrowText = pickText(values, ["eyebrow", "kicker", "overline"])
  const bodyText = pickText(values, ["children", "body", "description", "text", "copy"])
  const asideText = pickText(values, ["aside", "secondary", "meta"])
  const actionLabel = pickText(values, [
    "ctaLabel",
    "actionLabel",
    "buttonLabel",
    "linkLabel",
    "actionText",
    "label",
  ])
  const actionHref = pickText(values, ["href", "url", "ctaHref", "actionHref"])

  const titleSlot = slotByName("title")
  if (titleSlot) nextSource = applyText(nextSource, sourceId, titleSlot.canvasId, titleText)

  const eyebrowSlot = slotByName("eyebrow")
  if (eyebrowSlot) nextSource = applyText(nextSource, sourceId, eyebrowSlot.canvasId, eyebrowText)

  const bodySlot = slotByName("body")
  if (bodySlot) {
    nextSource = applyText(nextSource, sourceId, bodySlot.canvasId, bodyText)
  } else {
    const contentSlot = slotByName("content")
    if (contentSlot && contentSlot.kind === "text") {
      nextSource = applyText(nextSource, sourceId, contentSlot.canvasId, bodyText)
    }
  }

  const asideSlot = slotByName("aside")
  if (asideSlot) nextSource = applyText(nextSource, sourceId, asideSlot.canvasId, asideText)

  const actionsSlot = slotByName("actions")
  if (actionsSlot && actionsSlot.childElementCount > 0) {
    const firstActionCanvasId = `${actionsSlot.canvasId}.0`
    nextSource = applyText(nextSource, sourceId, firstActionCanvasId, actionLabel)
    nextSource = applyAttribute(nextSource, sourceId, firstActionCanvasId, "href", actionHref)
  }

  if (slots.length > 0) return nextSource

  const fallbackText = pickText(values, ["children", "label", "text", "title"])
  const fallbackHref = pickText(values, ["href", "url"])
  const { ids } = injectCanvasHtmlElementIds(nextSource, { sourceId, injectBridge: false })
  const textTarget = ids.find((entry) =>
    ["button", "a", "p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "li"].includes(entry.tag)
  )
  if (textTarget) nextSource = applyText(nextSource, sourceId, textTarget.canvasId, fallbackText)
  const linkTarget = ids.find((entry) => entry.tag === "a")
  if (linkTarget) nextSource = applyAttribute(nextSource, sourceId, linkTarget.canvasId, "href", fallbackHref)

  return nextSource
}
