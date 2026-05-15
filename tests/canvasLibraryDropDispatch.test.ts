import { describe, expect, it, vi } from "vitest"

import type { CanvasRegistryPrimitive } from "../utils/canvasRegistry"
import { dispatchCanvasLibraryDrop } from "../utils/canvasLibraryDropDispatch"

const button: CanvasRegistryPrimitive = {
  id: "primitive/button",
  displayName: "Button",
  category: "ui",
  kind: "tsx",
  filePath: "components/ui/Button.tsx",
  importName: "Button",
  snippet: '<Button variant="primary">Click me</Button>',
}

function mockJson(value: unknown, ok = true) {
  return { ok, json: async () => value } as Response
}

function lastBody(fetchImpl: typeof fetch): Record<string, unknown> {
  const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls
  return JSON.parse(calls[calls.length - 1]?.[1].body)
}

describe("dispatchCanvasLibraryDrop", () => {
  it("dispatches an insertChild with the primitive snippet as childSource", async () => {
    const fetchImpl = vi.fn(async () =>
      mockJson({
        ok: true,
        sourceReact: "next-source",
        appliedMutations: 1,
        canvasIdMap: { "stack:0": "stack:0" },
        prevSourceSnapshot: "prev-source",
        mtimeMs: 42,
      })
    ) as unknown as typeof fetch
    const onSourceReactChange = vi.fn()
    const onWriteSuccess = vi.fn()

    const result = await dispatchCanvasLibraryDrop(
      { kind: "insert", parentCanvasId: "stack:0", index: 1 },
      button,
      {
        sourceKind: "tsx",
        sourceId: "item-1",
        sourceReact: "old-source",
        fetchImpl,
        onSourceReactChange,
        onWriteSuccess,
      }
    )

    expect(result).toEqual({
      status: "applied",
      mutation: {
        type: "insertChild",
        parentCanvasId: "stack:0",
        position: 1,
        childSource: '<Button variant="primary">Click me</Button>',
      },
    })
    const body = lastBody(fetchImpl)
    expect(body.mutations).toEqual([
      {
        type: "insertChild",
        parentCanvasId: "stack:0",
        position: 1,
        childSource: '<Button variant="primary">Click me</Button>',
      },
    ])
    expect(body.sourceReact).toBe("old-source")
    expect(body.filePath).toBeUndefined()
    expect(onSourceReactChange).toHaveBeenCalledWith("next-source", 42)
    expect(onWriteSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceKind: "tsx",
        appliedMutations: 1,
        prevSourceSnapshot: "prev-source",
        nextSourceSnapshot: "next-source",
        canvasIdMap: { "stack:0": "stack:0" },
      })
    )
  })

  it("dispatches a wrapSelection with the derived wrapper tag for a leaf drop", async () => {
    const fetchImpl = vi.fn(async () =>
      mockJson({ ok: true, sourceReact: "wrapped", appliedMutations: 1, mtimeMs: 7 })
    ) as unknown as typeof fetch

    const result = await dispatchCanvasLibraryDrop(
      { kind: "wrap", canvasId: "leaf:0" },
      button,
      { sourceKind: "tsx", sourceId: "item-1", sourceReact: "src", fetchImpl }
    )

    expect(result).toEqual({
      status: "applied",
      mutation: { type: "wrapSelection", canvasId: "leaf:0", wrapperTag: "Button" },
    })
    expect(lastBody(fetchImpl).mutations).toEqual([
      { type: "wrapSelection", canvasId: "leaf:0", wrapperTag: "Button" },
    ])
  })

  it("passes filePath + mtimeMs and omits source text for file-backed nodes", async () => {
    const fetchImpl = vi.fn(async () =>
      mockJson({ ok: true, sourceReact: "after", appliedMutations: 1, mtimeMs: 11 })
    ) as unknown as typeof fetch

    await dispatchCanvasLibraryDrop(
      { kind: "insert", parentCanvasId: "p:0", index: 0 },
      button,
      {
        sourceKind: "tsx",
        sourceId: "projects/x/App.tsx",
        sourceReact: "should-not-be-sent",
        filePath: "projects/x/App.tsx",
        mtimeMs: 10,
        fetchImpl,
      }
    )

    const body = lastBody(fetchImpl)
    expect(body.filePath).toBe("projects/x/App.tsx")
    expect(body.mtimeMs).toBe(10)
    expect(body.sourceReact).toBeUndefined()
  })

  it("sends sourceHtml and reads back sourceHtml in inline HTML mode", async () => {
    const fetchImpl = vi.fn(async () =>
      mockJson({ ok: true, sourceHtml: "<div><Button /></div>", appliedMutations: 1 })
    ) as unknown as typeof fetch
    const onSourceHtmlChange = vi.fn()

    const result = await dispatchCanvasLibraryDrop(
      { kind: "insert", parentCanvasId: "root:0", index: 0 },
      button,
      {
        sourceKind: "html",
        sourceId: "item-2",
        sourceHtml: "<div></div>",
        fetchImpl,
        onSourceHtmlChange,
      }
    )

    expect(result.status).toBe("applied")
    expect(lastBody(fetchImpl).sourceHtml).toBe("<div></div>")
    expect(onSourceHtmlChange).toHaveBeenCalledWith("<div><Button /></div>", undefined)
  })

  it("returns an error result when the write endpoint rejects", async () => {
    const fetchImpl = vi.fn(async () =>
      mockJson({ ok: false, error: "childSource does not parse as JSX" }, false)
    ) as unknown as typeof fetch
    const onWriteSuccess = vi.fn()

    const result = await dispatchCanvasLibraryDrop(
      { kind: "insert", parentCanvasId: "p:0", index: 0 },
      button,
      { sourceKind: "tsx", sourceId: "i", sourceReact: "s", fetchImpl, onWriteSuccess }
    )

    expect(result).toEqual({
      status: "error",
      error: "childSource does not parse as JSX",
    })
    expect(onWriteSuccess).not.toHaveBeenCalled()
  })

  it("augments the message on an mtime-conflict code", async () => {
    const fetchImpl = vi.fn(async () =>
      mockJson({ ok: false, error: "Conflict.", code: "mtime-conflict" }, false)
    ) as unknown as typeof fetch

    const result = await dispatchCanvasLibraryDrop(
      { kind: "insert", parentCanvasId: "p:0", index: 0 },
      button,
      { sourceKind: "tsx", sourceId: "i", sourceReact: "s", fetchImpl }
    )

    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error).toContain("changed on disk")
    }
  })

  it("returns an error result when fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down")
    }) as unknown as typeof fetch

    const result = await dispatchCanvasLibraryDrop(
      { kind: "wrap", canvasId: "leaf:0" },
      button,
      { sourceKind: "tsx", sourceId: "i", sourceReact: "s", fetchImpl }
    )

    expect(result).toEqual({ status: "error", error: "network down" })
  })
})
