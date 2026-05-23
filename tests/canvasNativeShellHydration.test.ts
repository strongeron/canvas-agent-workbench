import { describe, expect, it } from "vitest"

import { buildNativeComponentShell } from "../utils/canvasNativeComponentShell"
import { hydrateNativeComponentShellFromProps } from "../utils/canvasNativeShellHydration"

describe("hydrateNativeComponentShellFromProps", () => {
  it("hydrates named slot text and action href from props", () => {
    const shell = buildNativeComponentShell("card")
    const hydrated = hydrateNativeComponentShellFromProps({
      sourceHtml: shell.sourceHtml,
      sourceId: "card-shell",
      values: {
        title: "Pricing",
        children: "Everything in one place.",
        href: "/pricing",
        buttonLabel: "Open pricing",
      },
    })

    expect(hydrated).toContain(">Pricing</h1>")
    expect(hydrated).toContain(">Everything in one place.</p>")
    expect(hydrated).toContain('href="/pricing"')
    expect(hydrated).toContain(">Open pricing</a>")
  })

  it("hydrates pure button shells from label-like props", () => {
    const shell = buildNativeComponentShell("button")
    const hydrated = hydrateNativeComponentShellFromProps({
      sourceHtml: shell.sourceHtml,
      sourceId: "button-shell",
      values: {
        children: "Continue",
      },
    })

    expect(hydrated).toContain(">Continue</button>")
  })

  it("hydrates pure anchor shells from text and href props", () => {
    const shell = buildNativeComponentShell("a")
    const hydrated = hydrateNativeComponentShellFromProps({
      sourceHtml: shell.sourceHtml,
      sourceId: "link-shell",
      values: {
        label: "Read more",
        href: "/docs",
      },
    })

    expect(hydrated).toContain(">Read more</a>")
    expect(hydrated).toContain('href="/docs"')
  })
})
