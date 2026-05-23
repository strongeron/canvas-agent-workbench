import { describe, expect, it } from "vitest"

import { suggestNativeTemplateForComponentName } from "../utils/canvasNativeComponentSuggestion"

describe("suggestNativeTemplateForComponentName", () => {
  it("maps known named templates", () => {
    expect(suggestNativeTemplateForComponentName("Card")).toBe("card")
    expect(suggestNativeTemplateForComponentName("Hero")).toBe("hero")
    expect(suggestNativeTemplateForComponentName("Media Object")).toBe("media-object")
  })

  it("maps known element-part names", () => {
    expect(suggestNativeTemplateForComponentName("Button")).toBe("button")
    expect(suggestNativeTemplateForComponentName("Header")).toBe("header")
  })

  it("falls back to section for unknown components", () => {
    expect(suggestNativeTemplateForComponentName("Pricing Table")).toBe("section")
  })
})
