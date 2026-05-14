import { describe, expect, it } from "vitest"

import {
  CANVAS_LIBRARY_DRAG_MIME,
  CANVAS_LIBRARY_DRAG_VERSION,
  buildLibraryDragPayload,
  parseLibraryDragPayload,
  readLibraryDragPayload,
  serializeLibraryDragPayload,
  writeLibraryDragPayload,
} from "../utils/canvasLibraryDrag"
import type { CanvasRegistryPrimitive } from "../utils/canvasRegistry"

const HTML_PRIMITIVE: CanvasRegistryPrimitive = {
  id: "button-primary",
  displayName: "Primary Button",
  category: "ui",
  kind: "html",
  filePath: "primitives/button.html",
}

const TSX_PRIMITIVE: CanvasRegistryPrimitive = {
  id: "card-tsx",
  displayName: "Card",
  category: "page",
  kind: "tsx",
  importName: "Card",
  componentSlug: "card",
}

function fakeDataTransfer() {
  const store = new Map<string, string>()
  return {
    setData(mime: string, value: string) {
      store.set(mime, value)
    },
    getData(mime: string) {
      return store.get(mime) ?? ""
    },
    set effectAllowed(_value: string) {},
    get effectAllowed() {
      return ""
    },
  } as unknown as DataTransfer
}

describe("canvasLibraryDrag payload", () => {
  it("round-trips an html primitive payload", () => {
    const payload = buildLibraryDragPayload({
      projectId: "design-system-foundation",
      primitive: HTML_PRIMITIVE,
    })
    const raw = serializeLibraryDragPayload(payload)
    const parsed = parseLibraryDragPayload(raw)
    expect(parsed).toEqual(payload)
  })

  it("round-trips a tsx primitive payload", () => {
    const payload = buildLibraryDragPayload({
      projectId: "demo",
      primitive: TSX_PRIMITIVE,
    })
    const raw = serializeLibraryDragPayload(payload)
    const parsed = parseLibraryDragPayload(raw)
    expect(parsed).toEqual(payload)
  })

  it("rejects malformed JSON", () => {
    expect(parseLibraryDragPayload("not json")).toBeNull()
  })

  it("rejects payloads with wrong kind", () => {
    expect(parseLibraryDragPayload(JSON.stringify({ kind: "other", version: 1 }))).toBeNull()
  })

  it("rejects payloads with mismatched version", () => {
    expect(
      parseLibraryDragPayload(
        JSON.stringify({
          kind: "library-primitive",
          version: 99,
          projectId: "p",
          primitive: HTML_PRIMITIVE,
        })
      )
    ).toBeNull()
  })

  it("rejects payloads missing required primitive fields", () => {
    expect(
      parseLibraryDragPayload(
        JSON.stringify({
          kind: "library-primitive",
          version: CANVAS_LIBRARY_DRAG_VERSION,
          projectId: "p",
          primitive: { id: "x" },
        })
      )
    ).toBeNull()
  })

  it("writes and reads via a DataTransfer-shaped object", () => {
    const payload = buildLibraryDragPayload({
      projectId: "design-system-foundation",
      primitive: HTML_PRIMITIVE,
    })
    const dt = fakeDataTransfer()
    writeLibraryDragPayload(dt, payload)
    expect(dt.getData(CANVAS_LIBRARY_DRAG_MIME)).toBe(serializeLibraryDragPayload(payload))
    expect(readLibraryDragPayload(dt)).toEqual(payload)
  })

  it("returns null when DataTransfer has no payload set", () => {
    const dt = fakeDataTransfer()
    expect(readLibraryDragPayload(dt)).toBeNull()
  })
})
