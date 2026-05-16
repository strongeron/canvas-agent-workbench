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
export const GROUP_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

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
    case 'create_items': {
      const nextBatch = Array.isArray(operation.items)
        ? operation.items.filter((item) => item && typeof item === 'object' && item.id)
        : []
      if (nextBatch.length === 0) {
        return current
      }

      const incomingIds = new Set(nextBatch.map((item) => item.id))
      const preserved = current.items.filter((item) => !incomingIds.has(item.id))
      const nextItems = [...preserved, ...nextBatch]

      return {
        ...current,
        items: nextItems,
        nextZIndex: Math.max(current.nextZIndex, deriveCanvasNextZIndex(nextItems)),
        selectedIds: operation.select ? nextBatch.map((item) => item.id) : current.selectedIds,
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
    case 'create_group': {
      if (!operation.group || typeof operation.group !== 'object' || !operation.group.id) {
        return current
      }
      const itemIds = normalizeIdList(operation.itemIds)
      const existingIndex = current.groups.findIndex((group) => group.id === operation.group.id)
      const nextGroups =
        existingIndex >= 0
          ? current.groups.map((group, index) => (index === existingIndex ? operation.group : group))
          : [...current.groups, operation.group]
      const nextItems = current.items.map((item) =>
        itemIds.includes(item.id) ? { ...item, groupId: operation.group.id } : item
      )

      return {
        ...current,
        items: nextItems,
        groups: nextGroups,
        selectedIds: operation.select ? itemIds : current.selectedIds,
      }
    }
    case 'update_group':
      if (!operation.id) return current
      return {
        ...current,
        groups: current.groups.map((group) =>
          group.id === operation.id ? { ...group, ...operation.updates } : group
        ),
      }
    case 'delete_group':
      if (!operation.id) return current
      return {
        ...current,
        items: current.items.map((item) =>
          item.groupId === operation.id ? { ...item, groupId: undefined } : item
        ),
        groups: current.groups.filter((group) => group.id !== operation.id),
      }
    case 'set_viewport':
    case 'focus_items':
      return current
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

export function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
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

export function createCreateItemsOperation(items, select = true) {
  return {
    type: 'create_items',
    items: Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : [],
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

export function createCreateGroupOperation(group, itemIds = [], select = false) {
  return {
    type: 'create_group',
    group,
    itemIds: normalizeIdList(itemIds),
    select,
  }
}

export function createUpdateGroupOperation(id, updates) {
  return {
    type: 'update_group',
    id,
    updates,
  }
}

export function createDeleteGroupOperation(id) {
  return {
    type: 'delete_group',
    id,
  }
}

export function createSetViewportOperation(viewport) {
  return {
    type: 'set_viewport',
    viewport: {
      scale: Number(viewport?.scale) || 1,
      offset: {
        x: Number(viewport?.offset?.x) || 0,
        y: Number(viewport?.offset?.y) || 0,
      },
    },
  }
}

export function createFocusItemsOperation(ids, padding, select = false) {
  return {
    type: 'focus_items',
    ids: normalizeIdList(ids),
    padding: Number.isFinite(padding) ? Number(padding) : undefined,
    select,
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

export function createCanvasGroup(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const itemIds = normalizeIdList(args.itemIds)
  if (itemIds.length === 0) {
    throw new Error('Canvas group requires at least one item id.')
  }

  const groupedItems = current.items.filter((item) => itemIds.includes(item.id))
  if (groupedItems.length === 0) {
    throw new Error('Canvas group item ids did not match any canvas items.')
  }

  const minX = Math.min(...groupedItems.map((item) => item.position.x))
  const minY = Math.min(...groupedItems.map((item) => item.position.y))

  return {
    id: normalizeString(args.id) || createCanvasItemId('group'),
    name: normalizeString(args.name) || `Group ${current.groups.length + 1}`,
    position: normalizePosition(args.position, { x: minX, y: minY }),
    isLocked: normalizeBoolean(args.isLocked, false),
    color:
      normalizeString(args.color) ||
      GROUP_COLORS[current.groups.length % GROUP_COLORS.length],
  }
}

export function createHtmlCanvasItem(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const src = normalizeString(args.src)
  const sourceReact = normalizeString(args.sourceReact)
  const sourceCss = typeof args.sourceCss === 'string' ? args.sourceCss : undefined
  const sourceHtml = normalizeString(args.sourceHtml || args.source)
  if (!src && !sourceHtml && !sourceReact) {
    throw new Error('HTML item src, sourceHtml, or sourceReact is required.')
  }

  return {
    id: createCanvasItemId('html'),
    type: 'html',
    src: src || undefined,
    title: normalizeString(args.title) || 'HTML bundle',
    sandbox:
      normalizeString(args.sandbox) || 'allow-scripts allow-same-origin allow-forms allow-modals',
    background: normalizeString(args.background) || undefined,
    sourceMode:
      ['bundle', 'inline', 'react', 'url'].includes(args.sourceMode)
        ? args.sourceMode
        : sourceReact
          ? 'react'
        : sourceHtml
          ? 'inline'
          : 'bundle',
    sourceHtml: sourceHtml || undefined,
    sourceReact: sourceReact || undefined,
    sourceCss,
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

function escapeHtmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildNativeComponentShell(args = {}) {
  const template = ['blank', 'card', 'section', 'hero', 'media-object'].includes(args.template)
    ? args.template
    : 'section'
  const defaultTitle =
    template === 'blank'
      ? 'Blank Native Component'
      : template === 'card'
        ? 'Card'
        : template === 'hero'
          ? 'Hero'
          : template === 'media-object'
            ? 'Media Object'
            : 'Section'
  const resolvedTitle = normalizeString(args.title) || defaultTitle
  const safeTitle = escapeHtmlText(resolvedTitle)

  switch (template) {
    case 'blank':
      return {
        title: resolvedTitle,
        size: { width: 720, height: 480 },
        sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        font: 16px/1.5 system-ui, sans-serif;
        color: #0f172a;
        background: #f8fafc;
      }
      section {
        min-height: 320px;
        padding: 32px;
        border: 1px dashed #cbd5e1;
        border-radius: 24px;
        background: white;
      }
    </style>
  </head>
  <body>
    <section data-slot="root" data-slot-kind="container">
      <h1 data-slot="title" data-slot-kind="text">${safeTitle}</h1>
      <p data-slot="body" data-slot-kind="text">Compose this component with native HTML elements.</p>
    </section>
  </body>
</html>`,
      }
    case 'card':
      return {
        title: resolvedTitle,
        size: { width: 560, height: 420 },
        sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        font: 16px/1.5 system-ui, sans-serif;
        color: #0f172a;
        background: #f8fafc;
      }
      article {
        display: grid;
        gap: 20px;
        padding: 24px;
        border: 1px solid #dbe2ea;
        border-radius: 24px;
        background: white;
        box-shadow: 0 24px 48px rgb(15 23 42 / 0.08);
      }
      figure {
        display: grid;
        place-items: center;
        min-height: 180px;
        margin: 0;
        border: 1px dashed #94a3b8;
        border-radius: 18px;
        background: linear-gradient(135deg, #eff6ff, #f8fafc);
        color: #475569;
      }
      svg {
        width: 72px;
        height: 72px;
      }
      h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: #475569;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0 16px;
        border-radius: 999px;
        text-decoration: none;
        background: #0f172a;
        color: white;
      }
      .button.secondary {
        background: #e2e8f0;
        color: #0f172a;
      }
    </style>
  </head>
  <body>
    <article data-slot="root" data-slot-kind="container">
      <figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video">
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="8" y="10" width="48" height="44" rx="12" stroke="currentColor" stroke-width="3" />
          <path d="M18 42L28 32L36 38L46 26L52 42" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="24" cy="24" r="4" fill="currentColor" />
        </svg>
        <figcaption>Media slot accepts image, SVG, or video.</figcaption>
      </figure>
      <div data-slot="content" data-slot-kind="container">
        <h1 data-slot="title" data-slot-kind="text">${safeTitle}</h1>
        <p data-slot="body" data-slot-kind="text">Group native text and media elements, then promote or save this shell as a reusable component.</p>
      </div>
      <div class="actions" data-slot="actions" data-slot-kind="container">
        <a class="button" href="#">Primary action</a>
        <a class="button secondary" href="#">Secondary</a>
      </div>
    </article>
  </body>
</html>`,
      }
    case 'hero':
      return {
        title: resolvedTitle,
        size: { width: 880, height: 520 },
        sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 28px;
        font: 16px/1.5 system-ui, sans-serif;
        color: #e2e8f0;
        background:
          radial-gradient(circle at top left, #1d4ed8, transparent 40%),
          linear-gradient(135deg, #0f172a, #1e293b 60%, #334155);
      }
      section {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
        gap: 24px;
        min-height: 420px;
        padding: 36px;
        border-radius: 28px;
        border: 1px solid rgb(148 163 184 / 0.28);
        background: rgb(15 23 42 / 0.32);
        backdrop-filter: blur(18px);
      }
      .copy {
        display: grid;
        align-content: center;
        gap: 18px;
      }
      h1 {
        margin: 0;
        font-size: 56px;
        line-height: 0.95;
        letter-spacing: -0.04em;
      }
      p {
        margin: 0;
        max-width: 46ch;
        color: #cbd5e1;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        background: white;
        color: #0f172a;
        text-decoration: none;
      }
      .button.secondary {
        background: transparent;
        color: white;
        border: 1px solid rgb(226 232 240 / 0.4);
      }
      figure {
        display: grid;
        place-items: center;
        min-height: 260px;
        margin: 0;
        border-radius: 24px;
        border: 1px dashed rgb(191 219 254 / 0.65);
        background: linear-gradient(160deg, rgb(59 130 246 / 0.24), rgb(15 23 42 / 0.08));
      }
      svg {
        width: 120px;
        height: 120px;
      }
    </style>
  </head>
  <body>
    <section data-slot="root" data-slot-kind="container">
      <div class="copy" data-slot="content" data-slot-kind="container">
        <p data-slot="eyebrow" data-slot-kind="text">Native HTML composition</p>
        <h1 data-slot="title" data-slot-kind="text">${safeTitle}</h1>
        <p data-slot="body" data-slot-kind="text">Build sections, divs, text, and media with real HTML, then keep iterating through the same canvas and agent mutation path.</p>
        <div class="actions" data-slot="actions" data-slot-kind="container">
          <a class="button" href="#">Start composing</a>
          <a class="button secondary" href="#">View structure</a>
        </div>
      </div>
      <figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video">
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <rect x="14" y="22" width="92" height="76" rx="18" stroke="currentColor" stroke-width="4" />
          <path d="M32 76L50 58L64 70L88 42L100 76" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="46" cy="44" r="6" fill="currentColor" />
        </svg>
      </figure>
    </section>
  </body>
</html>`,
      }
    case 'media-object':
      return {
        title: resolvedTitle,
        size: { width: 760, height: 340 },
        sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        font: 16px/1.5 system-ui, sans-serif;
        color: #0f172a;
        background: #f8fafc;
      }
      article {
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr);
        gap: 24px;
        padding: 24px;
        border-radius: 22px;
        background: white;
        border: 1px solid #dbe2ea;
      }
      figure {
        display: grid;
        place-items: center;
        min-height: 220px;
        margin: 0;
        border-radius: 18px;
        border: 1px dashed #94a3b8;
        background: linear-gradient(180deg, #eff6ff, #e2e8f0);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 32px;
        line-height: 1.05;
      }
      p {
        margin: 0;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <article data-slot="root" data-slot-kind="container">
      <figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video">
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="10" y="10" width="44" height="44" rx="14" stroke="currentColor" stroke-width="3" />
          <path d="M20 40L28 32L36 36L44 24L48 40" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </figure>
      <div data-slot="content" data-slot-kind="container">
        <h1 data-slot="title" data-slot-kind="text">${safeTitle}</h1>
        <p data-slot="body" data-slot-kind="text">Use this starter when you want an image, SVG, or video block paired with text content and actions.</p>
      </div>
    </article>
  </body>
</html>`,
      }
    case 'section':
    default:
      return {
        title: resolvedTitle,
        size: { width: 760, height: 420 },
        sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        font: 16px/1.5 system-ui, sans-serif;
        color: #0f172a;
        background: #f8fafc;
      }
      section {
        display: grid;
        gap: 20px;
        padding: 28px;
        border: 1px solid #dbe2ea;
        border-radius: 24px;
        background: white;
      }
      .header {
        display: grid;
        gap: 10px;
      }
      h1 {
        margin: 0;
        font-size: 36px;
        line-height: 1.05;
      }
      p {
        margin: 0;
        color: #475569;
      }
      .body {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
        gap: 20px;
      }
      .stack {
        display: grid;
        gap: 14px;
      }
      figure {
        display: grid;
        place-items: center;
        min-height: 220px;
        margin: 0;
        border-radius: 20px;
        border: 1px dashed #94a3b8;
        background: linear-gradient(180deg, #eff6ff, #f8fafc);
        color: #475569;
      }
      svg {
        width: 84px;
        height: 84px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0 16px;
        border-radius: 999px;
        text-decoration: none;
        background: #0f172a;
        color: white;
      }
    </style>
  </head>
  <body>
    <section data-slot="root" data-slot-kind="container">
      <div class="header" data-slot="header" data-slot-kind="container">
        <p data-slot="eyebrow" data-slot-kind="text">Editable native section</p>
        <h1 data-slot="title" data-slot-kind="text">${safeTitle}</h1>
        <p data-slot="body" data-slot-kind="text">Add divs, text, and media inside this shell, then keep iterating manually or with the agent.</p>
      </div>
      <div class="body" data-slot="content" data-slot-kind="container">
        <div class="stack" data-slot="copy" data-slot-kind="container">
          <p data-slot="detail" data-slot-kind="text">This starter already marks text and container slots with authored HTML attributes so the structure stays visible in source control.</p>
          <div class="actions" data-slot="actions" data-slot-kind="container">
            <a class="button" href="#">Primary action</a>
          </div>
        </div>
        <figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video">
          <svg viewBox="0 0 84 84" fill="none" aria-hidden="true">
            <rect x="12" y="12" width="60" height="60" rx="18" stroke="currentColor" stroke-width="3" />
            <path d="M24 54L36 42L46 48L60 30L66 54" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="34" cy="30" r="5" fill="currentColor" />
          </svg>
          <figcaption>Media slot</figcaption>
        </figure>
      </div>
    </section>
  </body>
</html>`,
      }
  }
}

export function createNativeComponentShellItem(state, args = {}) {
  const shell = buildNativeComponentShell(args)
  return createHtmlCanvasItem(state, {
    title: shell.title,
    sourceHtml: shell.sourceHtml,
    sourceMode: 'inline',
    background: normalizeString(args.background) || undefined,
    parentId: normalizeString(args.parentId || args.artboardId) || undefined,
    position: args.position,
    size: args.size || shell.size,
    sandbox: normalizeString(args.sandbox) || undefined,
  })
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
