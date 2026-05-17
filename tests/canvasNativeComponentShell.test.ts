import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

import { describe, expect, it } from "vitest"

import {
  NATIVE_COMPONENT_ELEMENT_PARTS,
  NATIVE_COMPONENT_LAYOUT_PRIMITIVES,
  NATIVE_COMPONENT_TEMPLATES,
  buildNativeComponentShell,
  escapeHtmlText,
} from "../utils/canvasNativeComponentShell"
import { listCanvasHtmlSlots } from "../utils/canvasHtmlEditor"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

async function loadMjsView() {
  return import("../utils/canvasNativeComponentShell.mjs")
}

function wellFormed(html: string) {
  expect(html.startsWith("<!doctype html>")).toBe(true)
  expect(html).toContain("<body>")
  expect(html).toContain("</body>")
  expect(html).toContain("</html>")
}

function slotSignature(html: string) {
  // sourceId is irrelevant to the (name, tag, kind, accepts) tuple we compare.
  return listCanvasHtmlSlots(html, { sourceId: "test" })
    .map((s) => `${s.name}|${s.tag}|${s.kind ?? ""}|${s.accepts ?? ""}`)
    .sort()
}

function tagTree(html: string) {
  // Normalize the body markup to a tag-only skeleton (whitespace + text +
  // attribute values removed) so we compare structure, not byte equality.
  const body = html.replace(/^[\s\S]*?<body>/, "").replace(/<\/body>[\s\S]*$/, "")
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>[^<]*</g, "><")
    .replace(/\s+/g, " ")
    .replace(/<(\/?[a-z0-9]+)[^>]*>/gi, "<$1>")
    .trim()
}

describe("buildNativeComponentShell — layout primitives", () => {
  it("exposes the seven documented layout primitives", () => {
    expect([...NATIVE_COMPONENT_LAYOUT_PRIMITIVES].sort()).toEqual(
      ["center", "cover", "frame", "grid", "row", "split", "stack"].sort()
    )
  })

  for (const id of [
    "stack",
    "row",
    "grid",
    "split",
    "center",
    "cover",
    "frame",
  ] as const) {
    it(`returns a well-formed shell with data-slot regions for "${id}"`, () => {
      const shell = buildNativeComponentShell(id)
      wellFormed(shell.sourceHtml)
      const slots = listCanvasHtmlSlots(shell.sourceHtml, { sourceId: id })
      expect(slots.length).toBeGreaterThan(0)
      // Layout roots are flex or grid containers.
      expect(/display:\s*(flex|grid)|aspect-ratio:/.test(shell.sourceHtml)).toBe(
        true
      )
      // Every region the builder marks is a real data-slot.
      for (const slot of slots) {
        expect(slot.name.length).toBeGreaterThan(0)
      }
    })
  }

  it("split exposes content + aside slots", () => {
    const slots = slotSignature(buildNativeComponentShell("split").sourceHtml)
    expect(slots.some((s) => s.startsWith("content|"))).toBe(true)
    expect(slots.some((s) => s.startsWith("aside|"))).toBe(true)
  })

  it("cover exposes top, center, bottom slots", () => {
    const names = listCanvasHtmlSlots(
      buildNativeComponentShell("cover").sourceHtml,
      { sourceId: "cover" }
    ).map((s) => s.name)
    expect(names).toEqual(expect.arrayContaining(["top", "center", "bottom"]))
  })

  it("frame exposes a media slot that accepts image/svg/video", () => {
    const slots = listCanvasHtmlSlots(
      buildNativeComponentShell("frame").sourceHtml,
      { sourceId: "frame" }
    )
    const media = slots.find((s) => s.name === "media")
    expect(media?.accepts).toContain("image")
    expect(media?.accepts).toContain("svg")
    expect(media?.accepts).toContain("video")
  })
})

describe("buildNativeComponentShell — element parts", () => {
  it("exposes the documented element-part ids", () => {
    expect(NATIVE_COMPONENT_ELEMENT_PARTS).toEqual(
      expect.arrayContaining([
        "div",
        "section",
        "header",
        "footer",
        "figure",
        "h1",
        "h6",
        "p",
        "span",
        "ul",
        "ol",
        "li",
        "a",
        "button",
        "img",
        "svg",
        "video",
      ])
    )
  })

  // `section` is also a named template; the bare id resolves to the named
  // "Section" shell (existing canvas default — see builder precedence note),
  // so it is asserted separately below rather than as a bare element part.
  const PURE_ELEMENT_PARTS = NATIVE_COMPONENT_ELEMENT_PARTS.filter(
    (id) => id !== "section"
  )

  for (const id of PURE_ELEMENT_PARTS) {
    it(`"${id}" is a single element shell with no data-slot/canvas artifacts`, () => {
      const shell = buildNativeComponentShell(id)
      wellFormed(shell.sourceHtml)
      expect(shell.sourceHtml).not.toContain("data-slot")
      expect(shell.sourceHtml).not.toContain("data-canvas")
      expect(
        listCanvasHtmlSlots(shell.sourceHtml, { sourceId: id })
      ).toHaveLength(0)
    })
  }

  it('the shared id "section" resolves to the named Section template (behavior-preserving)', () => {
    const shell = buildNativeComponentShell("section")
    expect(shell.title).toBe("Section")
    expect(shell.sourceHtml).toContain('data-slot="root"')
    expect(
      listCanvasHtmlSlots(shell.sourceHtml, { sourceId: "section" }).length
    ).toBeGreaterThan(0)
  })
})

describe("buildNativeComponentShell — named templates still work", () => {
  it("card/hero keep their shipped data-slot shape", () => {
    expect(slotSignature(buildNativeComponentShell("card").sourceHtml)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("root|article|container|"),
      ])
    )
    const heroNames = listCanvasHtmlSlots(
      buildNativeComponentShell("hero").sourceHtml,
      { sourceId: "hero" }
    ).map((s) => s.name)
    expect(heroNames).toEqual(
      expect.arrayContaining(["root", "eyebrow", "title", "body", "media"])
    )
  })
})

describe("buildNativeComponentShell — title handling & edge cases", () => {
  it("empty / whitespace title falls back to the default label", () => {
    expect(buildNativeComponentShell("stack").title).toBe("Stack")
    expect(buildNativeComponentShell("stack", "   ").title).toBe("Stack")
    expect(buildNativeComponentShell("section").title).toBe("Section")
  })

  it("escapes HTML-special characters in the title", () => {
    const shell = buildNativeComponentShell("stack", `<img src=x onerror="y">&'`)
    expect(shell.sourceHtml).not.toContain("<img src=x onerror")
    expect(shell.sourceHtml).toContain("&lt;img src=x onerror=&quot;y&quot;")
    expect(escapeHtmlText(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;")
  })

  it("unknown id falls back to the section template (no crash)", () => {
    const shell = buildNativeComponentShell(
      "totally-unknown-id" as never
    )
    wellFormed(shell.sourceHtml)
    expect(shell.title).toBe("Section")
    expect(
      listCanvasHtmlSlots(shell.sourceHtml, { sourceId: "x" }).length
    ).toBeGreaterThan(0)
  })

  it("accepts both positional and object call shapes", () => {
    const positional = buildNativeComponentShell("card", "My Card")
    const object = buildNativeComponentShell({
      template: "card",
      title: "My Card",
    })
    expect(positional.sourceHtml).toBe(object.sourceHtml)
    expect(positional.title).toBe("My Card")
  })
})

describe(".ts and derived .mjs view are semantically equivalent", () => {
  it("produces the same slot set and tag tree for every id", async () => {
    const mjs = await loadMjsView()
    const ids = [
      ...NATIVE_COMPONENT_TEMPLATES.map((t) => t.id),
      ...NATIVE_COMPONENT_ELEMENT_PARTS,
    ]
    for (const id of ids) {
      const fromTs = buildNativeComponentShell(id)
      const fromMjs = mjs.buildNativeComponentShell(id)
      expect(fromMjs.title).toEqual(fromTs.title)
      expect(slotSignature(fromMjs.sourceHtml)).toEqual(
        slotSignature(fromTs.sourceHtml)
      )
      expect(tagTree(fromMjs.sourceHtml)).toEqual(tagTree(fromTs.sourceHtml))
    }
  })
})

describe("the duplicate builder definitions were removed", () => {
  it("CanvasTab.tsx no longer defines buildNativeComponentShell", () => {
    const src = readFileSync(
      resolve(repoRoot, "components/canvas/CanvasTab.tsx"),
      "utf8"
    )
    expect(src).not.toMatch(/function\s+buildNativeComponentShell\s*\(/)
    // It imports the shared builder instead.
    expect(src).toContain("from \"../../utils/canvasNativeComponentShell\"")
  })

  it("canvasAgentOperations.mjs no longer defines buildNativeComponentShell", () => {
    const src = readFileSync(
      resolve(repoRoot, "utils/canvasAgentOperations.mjs"),
      "utf8"
    )
    expect(src).not.toMatch(
      /export\s+function\s+buildNativeComponentShell\s*\(/
    )
    expect(src).toContain("from './canvasNativeComponentShell.mjs'")
  })
})
