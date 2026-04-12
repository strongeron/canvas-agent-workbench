export const DEFAULT_ARTBOARD_LAYOUT = {
  display: 'flex',
  direction: 'column',
  align: 'stretch',
  justify: 'start',
  gap: 24,
  padding: 32,
}

export const DEFAULT_ARTBOARD_SIZE = { width: 1440, height: 900 }
export const DEFAULT_ARTBOARD_POSITION = { x: 120, y: 120 }
export const DEFAULT_HTML_ITEM_SIZE = { width: 720, height: 480 }
export const DEFAULT_EXPORT_FORMAT = 'react-tailwind'
export const EXPORT_FORMATS = new Set(['react-tailwind', 'react-css-vars'])

export function deriveCanvasNextZIndex(items) {
  const list = Array.isArray(items) ? items : []
  return list.reduce((max, item) => Math.max(max, Number(item?.zIndex || 0) + 1), 1)
}

export function normalizeCanvasStateSnapshot(input) {
  const items = Array.isArray(input?.items) ? input.items : []
  const groups = Array.isArray(input?.groups) ? input.groups : []
  const selectedIds = Array.isArray(input?.selectedIds) ? input.selectedIds : []
  const nextZIndex = Number.isFinite(input?.nextZIndex)
    ? Math.max(Number(input.nextZIndex), deriveCanvasNextZIndex(items))
    : deriveCanvasNextZIndex(items)

  return {
    items,
    groups,
    selectedIds,
    nextZIndex,
  }
}

export function collectCanvasCascadeDeleteIds(state, ids) {
  const current = normalizeCanvasStateSnapshot(state)
  const idsToRemove = new Set(Array.isArray(ids) ? ids : [])
  current.items.forEach((item) => {
    if (item?.parentId && idsToRemove.has(item.parentId)) {
      idsToRemove.add(item.id)
    }
  })
  return idsToRemove
}

export function applyCanvasRemoteOperationToState(state, operation) {
  const current = normalizeCanvasStateSnapshot(state)

  if (!operation || typeof operation !== 'object' || typeof operation.type !== 'string') {
    return current
  }

  switch (operation.type) {
    case 'create_item': {
      if (!operation.item || typeof operation.item !== 'object' || !operation.item.id) {
        return current
      }
      const existingIndex = current.items.findIndex((item) => item.id === operation.item.id)
      const nextItems =
        existingIndex >= 0
          ? current.items.map((item, index) => (index === existingIndex ? operation.item : item))
          : [...current.items, operation.item]

      return {
        ...current,
        items: nextItems,
        nextZIndex: Math.max(current.nextZIndex, deriveCanvasNextZIndex(nextItems)),
        selectedIds: operation.select ? [operation.item.id] : current.selectedIds,
      }
    }
    case 'update_item':
      if (!operation.id) return current
      return {
        ...current,
        items: current.items.map((item) =>
          item.id === operation.id ? { ...item, ...operation.updates } : item
        ),
      }
    case 'delete_items': {
      const idsToRemove = collectCanvasCascadeDeleteIds(current, operation.ids)
      return {
        ...current,
        items: current.items.filter((item) => !idsToRemove.has(item.id)),
        selectedIds: current.selectedIds.filter((id) => !idsToRemove.has(id)),
      }
    }
    case 'select_items':
      return {
        ...current,
        selectedIds: Array.isArray(operation.ids) ? operation.ids : [],
      }
    case 'clear_canvas':
      return {
        items: [],
        groups: [],
        nextZIndex: 1,
        selectedIds: [],
      }
    default:
      return current
  }
}

export function createCanvasItemId(prefix) {
  const slug = String(prefix || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item'
  return `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

export function normalizeIdList(value) {
  return Array.isArray(value) ? value.map((entry) => normalizeString(entry)).filter(Boolean) : []
}

export function normalizePosition(value, fallback = DEFAULT_ARTBOARD_POSITION) {
  return {
    x: Number.isFinite(value?.x) ? Number(value.x) : fallback.x,
    y: Number.isFinite(value?.y) ? Number(value.y) : fallback.y,
  }
}

export function normalizeSize(value, fallback = DEFAULT_ARTBOARD_SIZE) {
  return {
    width: Number.isFinite(value?.width) ? Math.max(80, Number(value.width)) : fallback.width,
    height: Number.isFinite(value?.height) ? Math.max(40, Number(value.height)) : fallback.height,
  }
}

export function normalizeArtboardLayout(value) {
  const input = value && typeof value === 'object' ? value : {}
  return {
    display: input.display === 'grid' ? 'grid' : DEFAULT_ARTBOARD_LAYOUT.display,
    direction: input.direction === 'row' ? 'row' : DEFAULT_ARTBOARD_LAYOUT.direction,
    align: ['start', 'center', 'end', 'stretch'].includes(input.align) ? input.align : DEFAULT_ARTBOARD_LAYOUT.align,
    justify: ['start', 'center', 'end', 'between'].includes(input.justify) ? input.justify : DEFAULT_ARTBOARD_LAYOUT.justify,
    gap: Number.isFinite(input.gap) ? Number(input.gap) : DEFAULT_ARTBOARD_LAYOUT.gap,
    columns: Number.isFinite(input.columns) ? Number(input.columns) : undefined,
    padding: Number.isFinite(input.padding) ? Number(input.padding) : DEFAULT_ARTBOARD_LAYOUT.padding,
  }
}

export function createCreateItemOperation(item, select = true) {
  return {
    type: 'create_item',
    item,
    select,
  }
}

export function createUpdateItemOperation(id, updates) {
  return {
    type: 'update_item',
    id,
    updates,
  }
}

export function createDeleteItemsOperation(ids) {
  return {
    type: 'delete_items',
    ids: normalizeIdList(ids),
  }
}

export function createSelectItemsOperation(ids) {
  return {
    type: 'select_items',
    ids: normalizeIdList(ids),
  }
}

export function createClearCanvasOperation() {
  return { type: 'clear_canvas' }
}

export function createArtboardItem(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  return {
    id: createCanvasItemId('artboard'),
    type: 'artboard',
    name: normalizeString(args.name) || 'Artboard',
    position: normalizePosition(args.position, DEFAULT_ARTBOARD_POSITION),
    size: normalizeSize(args.size, DEFAULT_ARTBOARD_SIZE),
    rotation: 0,
    zIndex: current.nextZIndex,
    background: normalizeString(args.background) || undefined,
    themeId: normalizeString(args.themeId) || undefined,
    layout: normalizeArtboardLayout(args.layout),
  }
}

export function createHtmlCanvasItem(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const src = normalizeString(args.src)
  if (!src) {
    throw new Error('HTML item src is required.')
  }

  return {
    id: createCanvasItemId('html'),
    type: 'html',
    src,
    title: normalizeString(args.title) || 'HTML bundle',
    sandbox:
      normalizeString(args.sandbox) || 'allow-scripts allow-same-origin allow-forms allow-modals',
    background: normalizeString(args.background) || undefined,
    entryAsset: normalizeString(args.entryAsset) || undefined,
    sourcePath: normalizeString(args.sourcePath) || undefined,
    sourceImportedAt: normalizeString(args.sourceImportedAt) || undefined,
    position: normalizePosition(args.position, DEFAULT_ARTBOARD_POSITION),
    size: normalizeSize(args.size, DEFAULT_HTML_ITEM_SIZE),
    rotation: 0,
    zIndex: current.nextZIndex,
    parentId: normalizeString(args.parentId) || undefined,
  }
}

export function resolvePrimitiveVariantIndex(primitive, args = {}) {
  if (Number.isFinite(args.variantIndex)) {
    const variantIndex = Number(args.variantIndex)
    if (variantIndex >= 0 && variantIndex < primitive.variants.length) return variantIndex
  }
  const variantName = normalizeString(args.variantName)
  if (variantName) {
    const byName = primitive.variants.findIndex((variant) => variant.name === variantName)
    if (byName >= 0) return byName
  }
  return primitive.variants.length > 0 ? 0 : -1
}

export function createPrimitiveCanvasItem(state, primitive, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const variantIndex = resolvePrimitiveVariantIndex(primitive, args)
  if (variantIndex < 0) {
    throw new Error(`Primitive variant not found for ${primitive?.primitiveId || 'unknown primitive'}.`)
  }

  const variant = primitive.variants[variantIndex]
  const mergedProps =
    args.props && typeof args.props === 'object'
      ? { ...(variant.props || {}), ...args.props }
      : null

  return {
    id: createCanvasItemId(primitive.name),
    type: 'component',
    componentId: primitive.entryId,
    variantIndex,
    position: normalizePosition(args.position, DEFAULT_ARTBOARD_POSITION),
    size: normalizeSize(args.size, primitive.defaultSize || { width: 320, height: 140 }),
    rotation: 0,
    zIndex: current.nextZIndex,
    parentId: normalizeString(args.parentId) || undefined,
    customProps: mergedProps && Object.keys(mergedProps).length > 0 ? mergedProps : undefined,
  }
}

export function normalizeComponentName(value) {
  const cleaned = String(value || 'CanvasBoard').replace(/[^a-zA-Z0-9]+/g, ' ').trim()
  const parts = (cleaned || 'Canvas Board').split(/\s+/)
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'CanvasBoard'
}

export function resolvePrimitiveImport(primitive) {
  const importPath = primitive.importPath
  const exportName = primitive.sourceId?.split('#')[1] || normalizeComponentName(primitive.name)
  return { importPath, exportName }
}

function formatStyleObject(styleObject) {
  const entries = Object.entries(styleObject).filter(([, value]) => value != null)
  if (entries.length === 0) return '{{}}'
  return `{{ ${entries
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`)
    .join(', ')} }}`
}

function escapeJsxText(value) {
  return String(value).replace(/[{}]/g, (match) => (match === '{' ? '&#123;' : '&#125;'))
}

function serializePrimitiveComponent(componentName, props) {
  const safeProps = props && typeof props === 'object' ? props : {}
  const attributes = []
  let children = null

  Object.entries(safeProps).forEach(([key, value]) => {
    if (value == null) return
    if (key === 'children' && (typeof value === 'string' || typeof value === 'number')) {
      children = String(value)
      return
    }
    if (typeof value === 'string') {
      attributes.push(`${key}=${JSON.stringify(value)}`)
      return
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      attributes.push(`${key}={${JSON.stringify(value)}}`)
      return
    }
    attributes.push(`${key}={${JSON.stringify(value)}}`)
  })

  const openTag = `<${componentName}${attributes.length > 0 ? ` ${attributes.join(' ')}` : ''}>`
  if (children != null) {
    return `${openTag}${escapeJsxText(children)}</${componentName}>`
  }
  return `${openTag}</${componentName}>`
}

function formatPrimitiveNodeLines(item, primitive, format) {
  const { exportName } = resolvePrimitiveImport(primitive)
  const props = item.customProps && typeof item.customProps === 'object'
    ? item.customProps
    : primitive.variants[item.variantIndex]?.props || {}
  const styleValue = formatStyleObject({
    position: 'absolute',
    left: Number(item.position?.x || 0),
    top: Number(item.position?.y || 0),
    width: Number(item.size?.width || primitive.defaultSize?.width || 320),
    height: Number(item.size?.height || primitive.defaultSize?.height || 120),
    transform: Number(item.rotation || 0) ? `rotate(${Number(item.rotation)}deg)` : undefined,
  })

  return [
    `      <div${format === 'tailwind' ? ' className="absolute"' : ''} style=${styleValue}>`,
    `        ${serializePrimitiveComponent(exportName, props)}`,
    '      </div>',
  ]
}

function buildTailwindBoardCode(componentName, artboard, primitiveChildren, importLines, warnings) {
  return [
    ...importLines,
    '',
    `export function ${componentName}() {`,
    '  return (',
    `    <div`,
    `      className="relative overflow-hidden rounded-[24px] border border-[var(--color-border-default)] bg-[var(--color-surface-canvas,var(--color-surface-50,#ffffff))]"`,
    `      style={{ width: ${Number(artboard.size?.width || DEFAULT_ARTBOARD_SIZE.width)}, height: ${Number(artboard.size?.height || DEFAULT_ARTBOARD_SIZE.height)}${artboard.background ? `, background: ${JSON.stringify(artboard.background)}` : ''} }}`,
    '    >',
    ...primitiveChildren.flatMap(({ item, primitive }) => formatPrimitiveNodeLines(item, primitive, 'tailwind')),
    '    </div>',
    '  )',
    '}',
    warnings.length > 0 ? '' : '',
    ...warnings.map((warning) => `// Warning: ${warning}`),
    '',
  ].join('\n')
}

function buildCssVarsBoardCode(componentName, artboard, primitiveChildren, importLines, warnings) {
  return [
    ...importLines,
    '',
    `export function ${componentName}() {`,
    '  return (',
    `    <div`,
    `      style={{ position: 'relative', overflow: 'hidden', width: ${Number(artboard.size?.width || DEFAULT_ARTBOARD_SIZE.width)}, height: ${Number(artboard.size?.height || DEFAULT_ARTBOARD_SIZE.height)}, borderRadius: 24, border: '1px solid var(--color-border-default)', background: ${artboard.background ? JSON.stringify(artboard.background) : `'var(--color-surface-canvas, var(--color-surface-50, #ffffff))'`} }}`,
    '    >',
    ...primitiveChildren.flatMap(({ item, primitive }) => formatPrimitiveNodeLines(item, primitive, 'css-vars')),
    '    </div>',
    '  )',
    '}',
    warnings.length > 0 ? '' : '',
    ...warnings.map((warning) => `// Warning: ${warning}`),
    '',
  ].join('\n')
}

export function exportCanvasBoard({ artboardId, format = DEFAULT_EXPORT_FORMAT, componentName, state, primitives }) {
  if (!artboardId) {
    throw new Error('artboardId is required.')
  }
  if (!EXPORT_FORMATS.has(format)) {
    throw new Error(`Unsupported export format: ${format}`)
  }

  const current = normalizeCanvasStateSnapshot(state)
  const items = Array.isArray(current.items) ? current.items : []
  const artboard = items.find((item) => item?.type === 'artboard' && item.id === artboardId)
  if (!artboard) {
    throw new Error(`Artboard not found: ${artboardId}`)
  }

  const children = items
    .filter((item) => item?.parentId === artboardId)
    .sort((left, right) => Number(left?.zIndex || 0) - Number(right?.zIndex || 0))

  const primitiveMap = new Map((Array.isArray(primitives) ? primitives : []).map((primitive) => [primitive.entryId, primitive]))
  const unsupported = []
  const primitiveChildren = []

  children.forEach((child) => {
    if (child?.type !== 'component') {
      unsupported.push({ id: child?.id || 'unknown', reason: `Unsupported item type: ${child?.type || 'unknown'}` })
      return
    }
    const primitive = primitiveMap.get(child.componentId)
    if (!primitive) {
      unsupported.push({ id: child.id, reason: `Component ${child.componentId} is not a registered primitive.` })
      return
    }
    if (primitive.exportable === false) {
      unsupported.push({ id: child.id, reason: `Primitive ${primitive.primitiveId} is not exportable.` })
      return
    }
    primitiveChildren.push({ item: child, primitive })
  })

  if (unsupported.length > 0) {
    throw new Error(
      `Artboard ${artboardId} is not exportable. Unsupported items: ${unsupported.map((entry) => `${entry.id} (${entry.reason})`).join('; ')}`
    )
  }

  const normalizedComponentName = normalizeComponentName(componentName || artboard.name || 'CanvasBoard')
  const imports = new Map()
  primitiveChildren.forEach(({ primitive }) => {
    const { importPath, exportName } = resolvePrimitiveImport(primitive)
    if (!imports.has(importPath)) {
      imports.set(importPath, new Set())
    }
    imports.get(importPath).add(exportName)
  })

  const importLines = Array.from(imports.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([importPath, exportNames]) => {
      const names = Array.from(exportNames).sort().join(', ')
      return `import { ${names} } from ${JSON.stringify(importPath)}`
    })

  const warnings = []
  if (children.length === 0) {
    warnings.push('Artboard has no child items.')
  }
  warnings.push('Export preserves canvas positioning. It does not infer semantic layout from spatial arrangement.')

  return {
    artboardId,
    componentName: normalizedComponentName,
    format,
    warnings,
    code:
      format === 'react-tailwind'
        ? buildTailwindBoardCode(normalizedComponentName, artboard, primitiveChildren, importLines, warnings)
        : buildCssVarsBoardCode(normalizedComponentName, artboard, primitiveChildren, importLines, warnings),
  }
}
