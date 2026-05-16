export type NativeComponentTemplate =
  | "blank"
  | "card"
  | "section"
  | "hero"
  | "media-object"

export interface NativeComponentTemplateDefinition {
  id: NativeComponentTemplate
  label: string
  description: string
  slotSummary: string
}

export const NATIVE_COMPONENT_TEMPLATES: NativeComponentTemplateDefinition[] = [
  {
    id: "section",
    label: "Section",
    description: "Balanced content + media section for page composition.",
    slotSummary: "header, title, body, actions, media",
  },
  {
    id: "card",
    label: "Card",
    description: "Compact content card with dedicated media and action areas.",
    slotSummary: "title, body, actions, media",
  },
  {
    id: "hero",
    label: "Hero",
    description: "Large landing section with headline, actions, and visual area.",
    slotSummary: "eyebrow, title, body, actions, media",
  },
  {
    id: "media-object",
    label: "Media Object",
    description: "Side-by-side media and text block for editorial layouts.",
    slotSummary: "title, body, media",
  },
  {
    id: "blank",
    label: "Blank",
    description: "Minimal shell for freeform native HTML composition.",
    slotSummary: "title, body",
  },
]

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildNativeComponentShell(
  template: NativeComponentTemplate = "section",
  title?: string
) {
  const defaultTitle =
    template === "blank"
      ? "Blank Native Component"
      : template === "card"
        ? "Card"
        : template === "hero"
          ? "Hero"
          : template === "media-object"
            ? "Media Object"
            : "Section"
  const resolvedTitle = title?.trim() || defaultTitle
  const safeTitle = escapeHtmlText(resolvedTitle)

  if (template === "blank") {
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
  }

  if (template === "card") {
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
  }

  if (template === "hero") {
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

  if (template === "media-object") {
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
