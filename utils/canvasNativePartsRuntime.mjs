import * as parse5 from 'parse5'

export const CANVAS_NATIVE_PART_KINDS = [
  'div',
  'section',
  'header',
  'footer',
  'heading',
  'paragraph',
  'button',
  'link',
  'image',
  'svg',
  'video',
]

function hashSourceId(sourceId) {
  let hash = 0x811c9dc5
  for (let i = 0; i < sourceId.length; i++) {
    hash ^= sourceId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 8)
}

function titleCaseSlotName(value) {
  return String(value || '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function slugifySlotLabel(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildSlotMediaSvg(label) {
  return `<svg viewBox="0 0 160 100" fill="none" aria-label="${label}"><rect x="1" y="1" width="158" height="98" rx="16" stroke="currentColor" stroke-dasharray="6 6"/><path d="M34 68L62 44L82 58L112 28L126 68" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="56" cy="34" r="8" fill="currentColor"/></svg>`
}

function isElementNode(node) {
  return Boolean(node && typeof node === 'object' && 'tagName' in node && Array.isArray(node.attrs))
}

function getParse5Attribute(element, name) {
  return element.attrs.find((attr) => attr.name === name)?.value || null
}

function getMeaningfulChildren(node) {
  return Array.isArray(node?.childNodes)
    ? node.childNodes.filter((child) => !(child.nodeName === '#text' && !String(child.value || '').trim()))
    : []
}

function walkElementChildren(node, parentPath, visit) {
  const children = getMeaningfulChildren(node).filter(isElementNode)
  children.forEach((child, index) => {
    const path = parentPath ? `${parentPath}.${index}` : String(index)
    visit(child, path)
    walkElementChildren(child, path, visit)
  })
}

export function listCanvasHtmlSlots(sourceHtml, { sourceId }) {
  const fragment = parse5.parseFragment(String(sourceHtml || ''), { sourceCodeLocationInfo: false })
  const sourceHash = hashSourceId(sourceId)
  const slots = []

  walkElementChildren(fragment, '', (element, path) => {
    const name = getParse5Attribute(element, 'data-slot')?.trim()
    if (!name) return
    slots.push({
      name,
      canvasId: `${sourceHash}:${path}`,
      tag: element.tagName,
      kind: getParse5Attribute(element, 'data-slot-kind')?.trim() || undefined,
      accepts: getParse5Attribute(element, 'data-slot-accepts')?.trim() || undefined,
      childElementCount: getMeaningfulChildren(element).filter(isElementNode).length,
    })
  })

  return slots
}

export function buildSlotNativePartInsertion(slot, part) {
  const label = titleCaseSlotName(slot?.name)
  const slug = slugifySlotLabel(label) || 'slot'
  const position = Number.isInteger(slot?.childElementCount) ? Number(slot.childElementCount) : 0

  switch (part) {
    case 'div':
      return {
        type: 'insertChild',
        position,
        childSource: `<div><p>${label} group</p></div>`,
      }
    case 'section':
      return {
        type: 'insertChild',
        position,
        childSource: `<section><h2>${label} section</h2><p>Describe this section.</p></section>`,
      }
    case 'header':
      return {
        type: 'insertChild',
        position,
        childSource: `<header><h2>${label} header</h2><p>Supporting intro copy.</p></header>`,
      }
    case 'footer':
      return {
        type: 'insertChild',
        position,
        childSource: `<footer><p>${label} footer</p></footer>`,
      }
    case 'heading':
      return {
        type: 'insertChild',
        position,
        childSource: `<h2>${label} heading</h2>`,
      }
    case 'paragraph':
      return {
        type: 'insertChild',
        position,
        childSource: `<p>${label} text</p>`,
      }
    case 'button':
      return {
        type: 'insertChild',
        position,
        childSource: `<button type="button">${label} action</button>`,
      }
    case 'link':
      return {
        type: 'insertChild',
        position,
        childSource: `<a href="#${slug}">${label} link</a>`,
      }
    case 'image':
      return {
        type: 'insertChild',
        position,
        childSource: `<img src="https://placehold.co/640x360/png?text=${encodeURIComponent(label)}" alt="${label}" />`,
      }
    case 'svg':
      return {
        type: 'insertChild',
        position,
        childSource: buildSlotMediaSvg(label),
      }
    case 'video':
      return {
        type: 'insertChild',
        position,
        childSource: `<video controls muted playsinline aria-label="${label}"><source src="" type="video/mp4" /></video>`,
      }
    default:
      throw new Error(`Unsupported native slot part: ${part || ''}`)
  }
}
