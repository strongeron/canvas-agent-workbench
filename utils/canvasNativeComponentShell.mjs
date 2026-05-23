// Single source of truth for the native-component shell builder.
//
// This `.mjs` holds the implementation; `canvasNativeComponentShell.ts` is a
// thin typed re-export of it (it adds TypeScript types only and never
// re-implements the template strings). The two therefore cannot drift.
//
// Why the source lives in `.mjs` rather than `.ts`: the canvas MCP server
// (`bin/canvas-mcp-server`) runs as raw `node` and imports
// `utils/canvasAgentOperations.mjs`, which in turn must reach this builder.
// Raw Node cannot import a `.ts` module, so the runnable implementation has to
// be plain JS. Vite, Vitest, and `vite.config.ts` already import `.mjs` from
// `.ts` (see `vite.config.ts` -> `canvasAgentOperations.mjs`), so the typed
// `.ts` re-export resolves cleanly for the UI bundle.
//
// Pure string templates only — no `node:*`/`fs`/`crypto`/`child_process`
// (client-import guard, eslint.config.js).

export const NATIVE_COMPONENT_LAYOUT_PRIMITIVES = [
  'stack',
  'row',
  'grid',
  'split',
  'center',
  'cover',
  'frame',
]

export const NATIVE_COMPONENT_ELEMENT_PARTS = [
  'div',
  'section',
  'header',
  'footer',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'span',
  'ul',
  'ol',
  'li',
  'a',
  'button',
  'img',
  'svg',
  'video',
]

const NAMED_TEMPLATE_IDS = ['blank', 'card', 'section', 'hero', 'media-object']

export const NATIVE_COMPONENT_TEMPLATES = [
  {
    id: 'section',
    label: 'Section',
    description: 'Balanced content + media section for page composition.',
    slotSummary: 'header, title, body, actions, media',
    group: 'named',
  },
  {
    id: 'card',
    label: 'Card',
    description: 'Compact content card with dedicated media and action areas.',
    slotSummary: 'title, body, actions, media',
    group: 'named',
  },
  {
    id: 'hero',
    label: 'Hero',
    description: 'Large landing section with headline, actions, and visual area.',
    slotSummary: 'eyebrow, title, body, actions, media',
    group: 'named',
  },
  {
    id: 'media-object',
    label: 'Media Object',
    description: 'Side-by-side media and text block for editorial layouts.',
    slotSummary: 'title, body, media',
    group: 'named',
  },
  {
    id: 'blank',
    label: 'Blank',
    description: 'Minimal shell for freeform native HTML composition.',
    slotSummary: 'title, body',
    group: 'named',
  },
  {
    id: 'stack',
    label: 'Stack',
    description: 'Vertical flex column that stacks children with a consistent gap.',
    slotSummary: 'root',
    group: 'layout',
  },
  {
    id: 'row',
    label: 'Row / Cluster',
    description: 'Horizontal flex row that wraps children with a consistent gap.',
    slotSummary: 'root',
    group: 'layout',
  },
  {
    id: 'grid',
    label: 'Grid',
    description: 'Auto-fit responsive grid with a minimum column width.',
    slotSummary: 'root',
    group: 'layout',
  },
  {
    id: 'split',
    label: 'Split / Sidebar',
    description: 'Main content beside a fixed-width sidebar aside.',
    slotSummary: 'content, aside',
    group: 'layout',
  },
  {
    id: 'center',
    label: 'Center',
    description: 'Max-width content centered horizontally on the page.',
    slotSummary: 'root',
    group: 'layout',
  },
  {
    id: 'cover',
    label: 'Cover',
    description: 'Full-height region with top, centered, and bottom slots.',
    slotSummary: 'top, center, bottom',
    group: 'layout',
  },
  {
    id: 'frame',
    label: 'Frame',
    description: 'Fixed aspect-ratio media box for a single visual.',
    slotSummary: 'media',
    group: 'layout',
  },
]

export function escapeHtmlText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const NAMED_DEFAULT_TITLES = {
  blank: 'Blank Native Component',
  card: 'Card',
  hero: 'Hero',
  'media-object': 'Media Object',
  section: 'Section',
}

const LAYOUT_DEFAULT_TITLES = {
  stack: 'Stack',
  row: 'Row',
  grid: 'Grid',
  split: 'Split',
  center: 'Center',
  cover: 'Cover',
  frame: 'Frame',
}

const ELEMENT_PART_LABELS = {
  div: 'Div',
  section: 'Section',
  header: 'Header',
  footer: 'Footer',
  figure: 'Figure',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  p: 'Paragraph',
  span: 'Span',
  ul: 'Unordered list',
  ol: 'Ordered list',
  li: 'List item',
  a: 'Link',
  button: 'Button',
  img: 'Image',
  svg: 'SVG',
  video: 'Video',
}

const SHELL_HEAD_STYLE = `      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        font: 16px/1.5 system-ui, sans-serif;
        color: #0f172a;
        background: transparent;
      }`

function namedShell(template, safeTitle, resolvedTitle) {
  if (template === 'blank') {
    return {
      title: resolvedTitle,
      size: { width: 720, height: 480 },
      sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
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
  }

  if (template === 'card') {
    return {
      title: resolvedTitle,
      size: { width: 560, height: 420 },
      sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
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
  }

  if (template === 'hero') {
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
  }

  if (template === 'media-object') {
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
  }

  return {
    title: resolvedTitle,
    size: { width: 760, height: 420 },
    sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
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

function layoutShell(template, safeTitle, resolvedTitle) {
  if (template === 'stack') {
    return {
      title: resolvedTitle,
      size: { width: 560, height: 480 },
      sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
      .stack {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px;
        min-height: 320px;
        border: 1px solid #dbe2ea;
        border-radius: 20px;
        background: white;
      }
      h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.15;
      }
      p {
        margin: 0;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="stack" data-slot="root" data-slot-kind="container">
      <h1 data-slot="title" data-slot-kind="text">${safeTitle}</h1>
      <p data-slot="body" data-slot-kind="text">Stack children vertically with a consistent gap.</p>
    </div>
  </body>
</html>`,
    }
  }

  if (template === 'row') {
    return {
      title: resolvedTitle,
      size: { width: 760, height: 320 },
      sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
      .row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
        padding: 24px;
        min-height: 160px;
        border: 1px solid #dbe2ea;
        border-radius: 20px;
        background: white;
      }
      .cell {
        flex: 1 1 160px;
        padding: 16px;
        border: 1px dashed #cbd5e1;
        border-radius: 14px;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="row" data-slot="root" data-slot-kind="container">
      <div class="cell">${safeTitle}</div>
      <div class="cell">Row children wrap with a consistent gap.</div>
    </div>
  </body>
</html>`,
    }
  }

  if (template === 'grid') {
    return {
      title: resolvedTitle,
      size: { width: 880, height: 520 },
      sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        padding: 24px;
        min-height: 320px;
        border: 1px solid #dbe2ea;
        border-radius: 20px;
        background: white;
      }
      .cell {
        padding: 20px;
        border: 1px dashed #cbd5e1;
        border-radius: 14px;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="grid" data-slot="root" data-slot-kind="container">
      <div class="cell">${safeTitle}</div>
      <div class="cell">Auto-fit grid cell</div>
      <div class="cell">Auto-fit grid cell</div>
    </div>
  </body>
</html>`,
    }
  }

  if (template === 'split') {
    return {
      title: resolvedTitle,
      size: { width: 960, height: 540 },
      sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
      .split {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 24px;
        padding: 24px;
        min-height: 360px;
        border: 1px solid #dbe2ea;
        border-radius: 20px;
        background: white;
      }
      .content {
        padding: 20px;
        border: 1px dashed #cbd5e1;
        border-radius: 14px;
        color: #475569;
      }
      aside {
        padding: 20px;
        border: 1px dashed #94a3b8;
        border-radius: 14px;
        background: #f8fafc;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="split" data-slot="root" data-slot-kind="container">
      <div class="content" data-slot="content" data-slot-kind="container">
        <p>${safeTitle}</p>
      </div>
      <aside data-slot="aside" data-slot-kind="container">
        <p>Sidebar content</p>
      </aside>
    </div>
  </body>
</html>`,
    }
  }

  if (template === 'center') {
    return {
      title: resolvedTitle,
      size: { width: 880, height: 480 },
      sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
      .center-outer {
        display: flex;
        justify-content: center;
        min-height: 320px;
      }
      .center {
        width: 100%;
        max-width: 640px;
        padding: 32px;
        border: 1px solid #dbe2ea;
        border-radius: 20px;
        background: white;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="center-outer">
      <div class="center" data-slot="root" data-slot-kind="container">
        <h1 data-slot="title" data-slot-kind="text">${safeTitle}</h1>
        <p data-slot="body" data-slot-kind="text">Max-width content centered horizontally.</p>
      </div>
    </div>
  </body>
</html>`,
    }
  }

  if (template === 'cover') {
    return {
      title: resolvedTitle,
      size: { width: 880, height: 600 },
      sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
      .cover {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 480px;
        padding: 24px;
        border: 1px solid #dbe2ea;
        border-radius: 20px;
        background: white;
      }
      .cover-center {
        flex: 1;
        display: grid;
        place-items: center;
        text-align: center;
        color: #475569;
      }
      .cover-edge {
        color: #94a3b8;
      }
      h1 {
        margin: 0;
        font-size: 32px;
        line-height: 1.1;
      }
    </style>
  </head>
  <body>
    <div class="cover" data-slot="root" data-slot-kind="container">
      <div class="cover-edge" data-slot="top" data-slot-kind="container">
        <p>Top region</p>
      </div>
      <div class="cover-center" data-slot="center" data-slot-kind="container">
        <h1 data-slot="title" data-slot-kind="text">${safeTitle}</h1>
      </div>
      <div class="cover-edge" data-slot="bottom" data-slot-kind="container">
        <p>Bottom region</p>
      </div>
    </div>
  </body>
</html>`,
    }
  }

  // frame
  return {
    title: resolvedTitle,
    size: { width: 640, height: 480 },
    sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
      .frame {
        aspect-ratio: 16 / 9;
        display: grid;
        place-items: center;
        overflow: hidden;
        border: 1px dashed #94a3b8;
        border-radius: 18px;
        background: linear-gradient(135deg, #eff6ff, #f8fafc);
        color: #475569;
      }
      svg {
        width: 96px;
        height: 96px;
      }
    </style>
  </head>
  <body>
    <figure class="frame" data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video">
      <svg viewBox="0 0 64 64" fill="none" aria-label="${safeTitle}">
        <rect x="8" y="10" width="48" height="44" rx="12" stroke="currentColor" stroke-width="3" />
        <path d="M18 42L28 32L36 38L46 26L52 42" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="24" cy="24" r="4" fill="currentColor" />
      </svg>
    </figure>
  </body>
</html>`,
  }
}

function elementPartShell(template, safeTitle, resolvedTitle) {
  const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  let body

  if (headingTags.includes(template)) {
    body = `<${template}>${safeTitle}</${template}>`
  } else if (template === 'p' || template === 'span') {
    body = `<${template}>${safeTitle}</${template}>`
  } else if (template === 'div' || template === 'section') {
    body = `<${template}><p>${safeTitle}</p></${template}>`
  } else if (template === 'header') {
    body = `<header><h2>${safeTitle}</h2></header>`
  } else if (template === 'footer') {
    body = `<footer><p>${safeTitle}</p></footer>`
  } else if (template === 'ul' || template === 'ol') {
    body = `<${template}><li>${safeTitle}</li><li>Second item</li></${template}>`
  } else if (template === 'li') {
    body = `<li>${safeTitle}</li>`
  } else if (template === 'a') {
    body = `<a href="#">${safeTitle}</a>`
  } else if (template === 'button') {
    body = `<button type="button">${safeTitle}</button>`
  } else if (template === 'img') {
    body = `<img src="https://placehold.co/640x360/png?text=${encodeURIComponent(
      resolvedTitle
    )}" alt="${safeTitle}" />`
  } else if (template === 'svg') {
    body = `<svg viewBox="0 0 64 64" fill="none" aria-label="${safeTitle}"><rect x="8" y="10" width="48" height="44" rx="12" stroke="currentColor" stroke-width="3" /><path d="M18 42L28 32L36 38L46 26L52 42" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /><circle cx="24" cy="24" r="4" fill="currentColor" /></svg>`
  } else if (template === 'video') {
    body = `<video controls muted playsinline aria-label="${safeTitle}"><source src="" type="video/mp4" /></video>`
  } else if (template === 'figure') {
    body = `<figure><svg viewBox="0 0 64 64" fill="none" aria-label="${safeTitle}"><rect x="8" y="10" width="48" height="44" rx="12" stroke="currentColor" stroke-width="3" /></svg><figcaption>${safeTitle}</figcaption></figure>`
  } else {
    body = `<div><p>${safeTitle}</p></div>`
  }

  return {
    title: resolvedTitle,
    size: { width: 480, height: 320 },
    sourceHtml: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
${SHELL_HEAD_STYLE}
      img,
      video,
      svg {
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`,
  }
}

function resolveBuildArgs(templateOrArgs, maybeTitle) {
  if (templateOrArgs && typeof templateOrArgs === 'object') {
    const template =
      typeof templateOrArgs.template === 'string' ? templateOrArgs.template : 'section'
    const title =
      typeof templateOrArgs.title === 'string' && templateOrArgs.title.trim()
        ? templateOrArgs.title.trim()
        : ''
    return { template, title }
  }
  const template = typeof templateOrArgs === 'string' ? templateOrArgs : 'section'
  const title =
    typeof maybeTitle === 'string' && maybeTitle.trim() ? maybeTitle.trim() : ''
  return { template, title }
}

/**
 * Build a native-component HTML shell.
 *
 * Accepts BOTH call shapes so existing callers keep working unchanged:
 *  - positional (UI):    buildNativeComponentShell(template, title)
 *  - object form (agent): buildNativeComponentShell({ template, title, ... })
 *
 * Unknown ids fall back to the `section` template (documented default,
 * never throws).
 */
export function buildNativeComponentShell(templateOrArgs, maybeTitle) {
  const { template: rawTemplate, title } = resolveBuildArgs(templateOrArgs, maybeTitle)

  let template = rawTemplate
  if (
    !NAMED_TEMPLATE_IDS.includes(template) &&
    !NATIVE_COMPONENT_LAYOUT_PRIMITIVES.includes(template) &&
    !NATIVE_COMPONENT_ELEMENT_PARTS.includes(template)
  ) {
    template = 'section'
  }

  const defaultTitle =
    NAMED_DEFAULT_TITLES[template] ||
    LAYOUT_DEFAULT_TITLES[template] ||
    ELEMENT_PART_LABELS[template] ||
    'Section'
  const resolvedTitle = title || defaultTitle
  const safeTitle = escapeHtmlText(resolvedTitle)

  // Precedence matters: `section` (and `header`/`footer`/`figure`) appear in
  // BOTH the named-template set and the element-part set. The bare id
  // `"section"` is the long-standing canvas default (dialog + handleAdd
  // default to it), so a named template must win for shared ids — this keeps
  // the consolidation behavior-preserving. Layout-primitive ids are unique.
  if (NAMED_TEMPLATE_IDS.includes(template)) {
    return namedShell(template, safeTitle, resolvedTitle)
  }
  if (NATIVE_COMPONENT_LAYOUT_PRIMITIVES.includes(template)) {
    return layoutShell(template, safeTitle, resolvedTitle)
  }
  if (NATIVE_COMPONENT_ELEMENT_PARTS.includes(template)) {
    return elementPartShell(template, safeTitle, resolvedTitle)
  }
  return namedShell(template, safeTitle, resolvedTitle)
}
