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

// Twin of the panel's private buildSlotStarter (CanvasHtmlPropsPanel.tsx) —
// keep the branches in sync: text slots become setTextContent (heading tags
// use the bare label), media-accepting slots get the placeholder SVG, and
// everything else gets a labeled content div appended after current children.
export function buildSlotStarterInsertion(slot) {
  const label = titleCaseSlotName(slot?.name)
  const accepts =
    typeof slot?.accepts === 'string' ? slot.accepts.split(',').map((entry) => entry.trim()) : []
  const position = Number.isInteger(slot?.childElementCount) ? Number(slot.childElementCount) : 0
  if (slot?.kind === 'text') {
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(slot?.tag)) {
      return { type: 'setTextContent', value: label }
    }
    return { type: 'setTextContent', value: `${label} text` }
  }
  if (accepts.includes('image') || accepts.includes('svg') || accepts.includes('video')) {
    return {
      type: 'insertChild',
      position,
      childSource: `<svg viewBox="0 0 160 100" fill="none" aria-label="${label}"><rect x="1" y="1" width="158" height="98" rx="16" stroke="currentColor" stroke-dasharray="6 6"/><path d="M34 68L62 44L82 58L112 28L126 68" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="56" cy="34" r="8" fill="currentColor"/></svg>`,
    }
  }
  return {
    type: 'insertChild',
    position,
    childSource: `<div><p>${label} content</p></div>`,
  }
}

// Twin of buildSlotComponentInsertion + buildPrimitiveChildSource
// (CanvasHtmlPropsPanel.tsx / canvasRegistry.ts): splice the registry
// primitive's own snippet in as one child expression. No import is emitted —
// inserting into a file that does not already import the component surfaces
// a recompile error, the same constraint the panel documents.
export function buildSlotComponentInsertion(slot, primitive) {
  const position = Number.isInteger(slot?.childElementCount) ? Number(slot.childElementCount) : 0
  const snippet = typeof primitive?.snippet === 'string' ? primitive.snippet.trim() : ''
  const importName = typeof primitive?.importName === 'string' ? primitive.importName.trim() : ''
  const displayName =
    typeof primitive?.displayName === 'string' && primitive.displayName
      ? primitive.displayName
      : 'Component'
  const childSource = snippet
    ? snippet
    : importName
      ? `<${importName} />`
      : `<div>${displayName.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`
  return {
    type: 'insertChild',
    position,
    childSource,
  }
}

export function buildSlotNativePartInsertion(slot, part, options = {}) {
  const label = titleCaseSlotName(slot?.name)
  const slug = slugifySlotLabel(label) || 'slot'
  const position = Number.isInteger(slot?.childElementCount) ? Number(slot.childElementCount) : 0
  const sourceUrl = typeof options?.sourceUrl === 'string' ? options.sourceUrl.trim() : ''

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
        childSource: `<a href="${sourceUrl || `#${slug}`}">${label} link</a>`,
      }
    case 'image':
      return {
        type: 'insertChild',
        position,
        childSource: `<img src="${sourceUrl || `https://placehold.co/640x360/png?text=${encodeURIComponent(label)}`}" alt="${label}" />`,
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
        childSource: `<video controls muted playsinline aria-label="${label}"><source src="${sourceUrl}" type="video/mp4" /></video>`,
      }
    default:
      throw new Error(`Unsupported native slot part: ${part || ''}`)
  }
}
