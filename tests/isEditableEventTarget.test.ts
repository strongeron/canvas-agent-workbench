// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { isEditableEventTarget } from "../utils/isEditableEventTarget"

describe("isEditableEventTarget", () => {
  it("matches native form fields", () => {
    expect(isEditableEventTarget(document.createElement("input"))).toBe(true)
    expect(isEditableEventTarget(document.createElement("textarea"))).toBe(true)
    expect(isEditableEventTarget(document.createElement("select"))).toBe(true)
  })

  it("matches contenteditable nodes and descendants", () => {
    const host = document.createElement("div")
    host.setAttribute("contenteditable", "true")
    const child = document.createElement("span")
    host.appendChild(child)

    expect(isEditableEventTarget(host)).toBe(true)
    expect(isEditableEventTarget(child)).toBe(true)
  })

  it("ignores non-editable targets", () => {
    expect(isEditableEventTarget(document.createElement("button"))).toBe(false)
    expect(isEditableEventTarget(document.createElement("div"))).toBe(false)
    expect(isEditableEventTarget(null)).toBe(false)
  })
})
