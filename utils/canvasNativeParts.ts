import type { CanvasHtmlSlotInfo } from "./canvasHtmlEditor"

export type CanvasNativePartKind =
  | "div"
  | "section"
  | "header"
  | "footer"
  | "heading"
  | "paragraph"
  | "button"
  | "link"
  | "image"
  | "svg"
  | "video"

export interface CanvasNativePartOption {
  kind: CanvasNativePartKind
  label: string
}

const BASE_SLOT_PART_OPTIONS: CanvasNativePartOption[] = [
  { kind: "div", label: "Div group" },
  { kind: "section", label: "Section" },
  { kind: "header", label: "Header" },
  { kind: "footer", label: "Footer" },
  { kind: "heading", label: "Heading" },
  { kind: "paragraph", label: "Paragraph" },
  { kind: "button", label: "Button" },
  { kind: "link", label: "Link" },
]

const MEDIA_SLOT_PART_OPTIONS: CanvasNativePartOption[] = [
  { kind: "image", label: "Image" },
  { kind: "svg", label: "SVG" },
  { kind: "video", label: "Video" },
]

function titleCaseSlotName(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function slugifySlotLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildSlotMediaSvg(label: string) {
  return `<svg viewBox="0 0 160 100" fill="none" aria-label="${label}"><rect x="1" y="1" width="158" height="98" rx="16" stroke="currentColor" stroke-dasharray="6 6"/><path d="M34 68L62 44L82 58L112 28L126 68" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="56" cy="34" r="8" fill="currentColor"/></svg>`
}

export function listSlotNativePartOptions(
  slot: Pick<CanvasHtmlSlotInfo, "kind" | "accepts"> & Partial<CanvasHtmlSlotInfo>
) {
  if (slot.kind === "text") return []
  const accepts = slot.accepts?.split(",").map((entry) => entry.trim()) ?? []
  return accepts.some((entry) => ["image", "svg", "video"].includes(entry))
    ? [...BASE_SLOT_PART_OPTIONS, ...MEDIA_SLOT_PART_OPTIONS]
    : BASE_SLOT_PART_OPTIONS
}

export function buildSlotNativePartInsertion(
  slot: Pick<CanvasHtmlSlotInfo, "name" | "childElementCount">,
  part: CanvasNativePartKind
) {
  const label = titleCaseSlotName(slot.name)
  const slug = slugifySlotLabel(label) || "slot"

  switch (part) {
    case "div":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<div><p>${label} group</p></div>`,
      }
    case "section":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<section><h2>${label} section</h2><p>Describe this section.</p></section>`,
      }
    case "header":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<header><h2>${label} header</h2><p>Supporting intro copy.</p></header>`,
      }
    case "footer":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<footer><p>${label} footer</p></footer>`,
      }
    case "heading":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<h2>${label} heading</h2>`,
      }
    case "paragraph":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<p>${label} text</p>`,
      }
    case "button":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<button type="button">${label} action</button>`,
      }
    case "link":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<a href="#${slug}">${label} link</a>`,
      }
    case "image":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: `<img src="https://placehold.co/640x360/png?text=${encodeURIComponent(
          label
        )}" alt="${label}" />`,
      }
    case "svg":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource: buildSlotMediaSvg(label),
      }
    case "video":
      return {
        type: "insertChild" as const,
        position: slot.childElementCount,
        childSource:
          '<video controls muted playsinline aria-label="' +
          label +
          '"><source src="" type="video/mp4" /></video>',
      }
  }
}
