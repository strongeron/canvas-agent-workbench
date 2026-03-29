import { describe, expect, it } from "vitest"

import {
  DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG,
  createDesignSystemTokenBundle,
  resolveFluidValuePx,
} from "../projects/design-system-foundation/designSystemApi"

describe("createDesignSystemTokenBundle", () => {
  it("builds fluid typography tokens with capsize-backed line heights", () => {
    const bundle = createDesignSystemTokenBundle(DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG)
    const base = bundle.typography.find((step) => step.id === "base")
    const display = bundle.typography.find((step) => step.id === "3xl")

    expect(base).toBeDefined()
    expect(base?.clamp).toContain("clamp(")
    expect(base?.lineHeightClamp).toContain("clamp(")
    expect(base?.capHeightTrim).toContain("em")
    expect(display?.fontFamilyVar).toBe("--font-family-display")
    expect(bundle.cssVars["--font-size-base"]).toBe(base?.clamp)
    expect(bundle.cssVars["--line-height-base"]).toBe(base?.lineHeightClamp)
  })

  it("derives icon and control sizes from the type scale", () => {
    const bundle = createDesignSystemTokenBundle(DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG)
    const icon = bundle.icons.find((entry) => entry.id === "md")
    const control = bundle.controls.find((entry) => entry.id === "md")
    const pairedType = bundle.typography.find((entry) => entry.id === "base")

    expect(icon).toBeDefined()
    expect(control).toBeDefined()
    expect(pairedType).toBeDefined()
    expect(icon?.minPx).toBeGreaterThanOrEqual(pairedType?.lineHeightMinPx ?? 0)
    expect(control?.minPx).toBeGreaterThan(icon?.minPx ?? 0)
    expect(bundle.cssVars["--icon-size-md"]).toBe(icon?.clamp)
    expect(bundle.cssVars["--size-control-md"]).toBe(control?.clamp)
  })

  it("emits tweakable font-weight tokens alongside icon stroke", () => {
    const bundle = createDesignSystemTokenBundle({
      ...DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG,
      fontWeightSans: 425,
      fontWeightDisplay: 700,
      iconStroke: 1.75,
    })

    expect(bundle.cssVars["--font-weight-sans"]).toBe("425")
    expect(bundle.cssVars["--font-weight-sans-medium"]).toBe("525")
    expect(bundle.cssVars["--font-weight-display"]).toBe("700")
    expect(bundle.cssVars["--icon-stroke"]).toBe("1.75px")
    expect(bundle.dtcgDocument.font.weight.display.$extensions?.cssVar).toBe("--font-weight-display")
  })

  it("responds to density changes in spacing and control tokens", () => {
    const compact = createDesignSystemTokenBundle({
      ...DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG,
      density: 0.85,
    })
    const comfortable = createDesignSystemTokenBundle({
      ...DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG,
      density: 1.15,
    })

    const compactSpace = compact.spacing.find((entry) => entry.id === "400")
    const comfortableSpace = comfortable.spacing.find((entry) => entry.id === "400")
    const compactControl = compact.controls.find((entry) => entry.id === "lg")
    const comfortableControl = comfortable.controls.find((entry) => entry.id === "lg")

    expect(compactSpace?.minPx).toBeLessThan(comfortableSpace?.minPx ?? 0)
    expect(compactControl?.cssVar).toBe("--size-control-lg")
    expect(comfortableControl?.cssVar).toBe("--size-control-lg")
  })

  it("emits DTCG and Radix adapter artifacts", () => {
    const bundle = createDesignSystemTokenBundle(DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG)

    expect(bundle.dtcgDocument.font.size.base.$extensions?.cssVar).toBe("--font-size-base")
    expect(bundle.dtcgJson).toContain('"font"')
    expect(bundle.aliasVars["--ds-font-size-base"]).toBe("var(--font-size-base)")
    expect(bundle.radix.cssText).toContain(".radix-themes")
    expect(bundle.radix.cssText).toContain("--font-size-3")
    expect(bundle.radix.mappings.some((mapping) => mapping.radixVar === "--accent-9")).toBe(true)
  })

  it("resolves responsive checkpoints from min and max values", () => {
    expect(resolveFluidValuePx(16, 20, 320, 1440, 320)).toBe(16)
    expect(resolveFluidValuePx(16, 20, 320, 1440, 1440)).toBe(20)
    expect(resolveFluidValuePx(16, 20, 320, 1440, 880)).toBe(18)
  })
})
