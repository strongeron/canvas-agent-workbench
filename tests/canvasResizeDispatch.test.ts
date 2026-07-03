import { describe, expect, it, vi } from "vitest"

import type { CanvasReactNodeResizeEvent } from "../components/canvas/CanvasHtmlFrame"
import { dispatchCanvasResize } from "../utils/canvasResizeDispatch"

function makeEvent(
  overrides: Partial<CanvasReactNodeResizeEvent> = {}
): CanvasReactNodeResizeEvent {
  return {
    itemId: "item-1",
    canvasId: "abc:0",
    kind: "se",
    deltaIframe: { dx: 28, dy: 24 },
    rect: { x: 0, y: 0, width: 100, height: 40 },
    ...overrides,
  }
}

function mockJson(value: unknown, ok = true) {
  return {
    ok,
    json: async () => value,
  } as Response
}

function mockFetchSequence(...responses: Response[]): typeof fetch {
  const queue = [...responses]
  return vi.fn(async () => {
    const next = queue.shift()
    if (!next) throw new Error("mockFetchSequence: exhausted")
    return next
  }) as unknown as typeof fetch
}

describe("dispatchCanvasResize", () => {
  it("returns no-op:move-handle without touching the network for move drags", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const result = await dispatchCanvasResize(makeEvent({ kind: "move" }), {
      sourceKind: "tsx",
      sourceId: "item-1",
      sourceReact: "x",
      fetchImpl,
    })
    expect(result).toEqual({ status: "no-op", reason: "move-handle" })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("inserts snapped size classes when the element has no className attr yet", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: { canvasId: "abc:0", tag: "div", attributes: [], textChildren: "" },
      }),
      mockJson({
        ok: true,
        sourceReact: "export default function P() { return <div className='w-32 h-16'>x</div> }",
        mtimeMs: 99,
      })
    )
    const onSourceReactChange = vi.fn()
    const result = await dispatchCanvasResize(makeEvent(), {
      sourceKind: "tsx",
      sourceId: "item-1",
      sourceReact: "x",
      fetchImpl,
      onSourceReactChange,
    })
    expect(result.status).toBe("applied")
    if (result.status === "applied") {
      expect(result.mutation).toEqual({ type: "setClassName", value: "w-32 h-16" })
    }
    expect(onSourceReactChange).toHaveBeenCalledWith(
      "export default function P() { return <div className='w-32 h-16'>x</div> }",
      99
    )
    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls
    expect(calls).toHaveLength(2)
    const writeBody = JSON.parse(calls[1]?.[1].body)
    expect(writeBody.mutations).toEqual([{ type: "setClassName", value: "w-32 h-16" }])
  })

  it("returns no-op:non-literal-class when className is an expression (e.g. cn(...))", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "div",
          attributes: [
            { name: "className", kind: "expression", value: "cn('w-4', x && 'p-2')", rawValue: "" },
          ],
          textChildren: "",
        },
      })
    )
    const result = await dispatchCanvasResize(makeEvent(), {
      sourceKind: "tsx",
      sourceId: "item-1",
      sourceReact: "x",
      fetchImpl,
    })
    expect(result).toEqual({ status: "no-op", reason: "non-literal-class" })
  })

  it("falls back to an inline-style write for an HTML node with a computed class (U4a)", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "div",
          attributes: [
            { name: "class", kind: "expression", value: "clsx('card', open && 'open')", rawValue: "" },
            { name: "style", kind: "literal-string", value: "color: red", rawValue: "" },
          ],
          textChildren: "",
        },
      }),
      mockJson({ ok: true, sourceHtml: "<div style=\"color: red; width: 128px; height: 64px\"></div>", mtimeMs: 7 })
    )
    const onSourceHtmlChange = vi.fn()
    const result = await dispatchCanvasResize(
      makeEvent({ kind: "se", deltaIframe: { dx: 28, dy: 24 } }),
      { sourceKind: "html", sourceId: "item-1", sourceHtml: "<div></div>", fetchImpl, onSourceHtmlChange }
    )
    expect(result.status).toBe("applied")
    if (result.status === "applied") {
      expect(result.mutation).toEqual({
        type: "setAttribute",
        attrName: "style",
        value: "color: red; width: 128px; height: 64px",
      })
    }
    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls
    const writeBody = JSON.parse(calls[1][1].body)
    expect(writeBody.mutations).toEqual([
      { type: "setAttribute", attrName: "style", value: "color: red; width: 128px; height: 64px" },
    ])
    expect(onSourceHtmlChange).toHaveBeenCalled()
  })

  it("returns no-op:sub-snap when the snap is the same as the current class", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "div",
          attributes: [
            { name: "className", kind: "literal-string", value: "w-24 h-10", rawValue: '"w-24 h-10"' },
          ],
          textChildren: "",
        },
      })
    )
    // delta dx=1 on a 96px-wide (w-24) rect snaps back to 96 = w-24 = no-op.
    const result = await dispatchCanvasResize(
      makeEvent({ kind: "e", deltaIframe: { dx: 1, dy: 0 }, rect: { x: 0, y: 0, width: 96, height: 40 } }),
      {
        sourceKind: "tsx",
        sourceId: "item-1",
        sourceReact: "x",
        fetchImpl,
      }
    )
    expect(result).toEqual({ status: "no-op", reason: "sub-snap" })
  })

  it("applies the mutation end-to-end and propagates the new source to onSourceReactChange", async () => {
    const newSource = "export default function P() { return <button className='w-32 h-16'>x</button> }"
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "button",
          attributes: [
            { name: "className", kind: "literal-string", value: "w-24 h-10 rounded", rawValue: '"w-24 h-10 rounded"' },
          ],
          textChildren: "x",
        },
      }),
      mockJson({
        ok: true,
        sourceReact: newSource,
        mtimeMs: 1234,
      })
    )
    const onSourceReactChange = vi.fn()
    const result = await dispatchCanvasResize(makeEvent(), {
      sourceKind: "tsx",
      sourceId: "item-1",
      sourceReact: "old source",
      fetchImpl,
      onSourceReactChange,
    })
    expect(result.status).toBe("applied")
    if (result.status === "applied") {
      expect(result.mutation).toEqual({ type: "setClassName", value: "w-32 h-16 rounded" })
    }
    expect(onSourceReactChange).toHaveBeenCalledWith(newSource, 1234)
  })

  it("propagates HTML rewrites through onSourceHtmlChange for sourceKind=html", async () => {
    const newHtml = "<button class='w-32 h-16'>x</button>"
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "button",
          attributes: [
            { name: "class", kind: "literal-string", value: "w-24 h-10", rawValue: '"w-24 h-10"' },
          ],
          textChildren: "x",
        },
      }),
      mockJson({
        ok: true,
        sourceHtml: newHtml,
        mtimeMs: 4321,
      })
    )
    const onSourceHtmlChange = vi.fn()
    const result = await dispatchCanvasResize(makeEvent(), {
      sourceKind: "html",
      sourceId: "item-1",
      sourceHtml: "<button class='w-24 h-10'>x</button>",
      fetchImpl,
      onSourceHtmlChange,
    })
    expect(result.status).toBe("applied")
    expect(onSourceHtmlChange).toHaveBeenCalledWith(newHtml, 4321)
  })

  it("returns error when the read endpoint fails", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({ ok: false, error: "Element not in current compile." })
    )
    const result = await dispatchCanvasResize(makeEvent(), {
      sourceKind: "tsx",
      sourceId: "item-1",
      sourceReact: "x",
      fetchImpl,
    })
    expect(result).toEqual({ status: "error", error: "Element not in current compile." })
  })

  it("returns error with mtime-conflict context when the writer rejects on stale mtime", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "button",
          attributes: [
            { name: "className", kind: "literal-string", value: "w-24 h-10", rawValue: '"w-24 h-10"' },
          ],
          textChildren: "x",
        },
      }),
      mockJson({ ok: false, code: "mtime-conflict", error: "File modified." })
    )
    const result = await dispatchCanvasResize(makeEvent(), {
      sourceKind: "tsx",
      sourceId: "item-1",
      filePath: "/abs/path.tsx",
      mtimeMs: 100,
      fetchImpl,
    })
    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error).toMatch(/File modified.*changed on disk/)
    }
  })

  it("does not send sourceReact when filePath is provided (file-backed mode)", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "button",
          attributes: [
            { name: "className", kind: "literal-string", value: "w-24 h-10", rawValue: '"w-24 h-10"' },
          ],
          textChildren: "x",
        },
      }),
      mockJson({ ok: true, sourceReact: "x", mtimeMs: 1 })
    )
    await dispatchCanvasResize(makeEvent(), {
      sourceKind: "tsx",
      sourceId: "item-1",
      filePath: "/abs/path.tsx",
      mtimeMs: 100,
      sourceReact: "should-not-be-sent",
      fetchImpl,
    })
    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls
    const readBody = JSON.parse(calls[0][1].body)
    expect(readBody.sourceReact).toBeUndefined()
    expect(readBody.filePath).toBe("/abs/path.tsx")
    const writeBody = JSON.parse(calls[1][1].body)
    expect(writeBody.sourceReact).toBeUndefined()
    expect(writeBody.mtimeMs).toBe(100)
  })

  it("fires onWriteSuccess with the endpoint's snapshots so the caller can log undo", async () => {
    const newSource = "export default function P() { return <div className='w-32 h-16'>x</div> }"
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "div",
          attributes: [
            { name: "className", kind: "literal-string", value: "w-24 h-10", rawValue: '"w-24 h-10"' },
          ],
          textChildren: "x",
        },
      }),
      mockJson({
        ok: true,
        sourceReact: newSource,
        prevSourceSnapshot: "old source",
        appliedMutations: 1,
        canvasIdMap: { "abc:0": "abc:0" },
        mtimeMs: 1234,
      })
    )
    const onWriteSuccess = vi.fn()
    await dispatchCanvasResize(makeEvent(), {
      sourceKind: "tsx",
      sourceId: "item-1",
      sourceReact: "old source",
      fetchImpl,
      onWriteSuccess,
    })
    expect(onWriteSuccess).toHaveBeenCalledTimes(1)
    const payload = onWriteSuccess.mock.calls[0][0]
    expect(payload.sourceKind).toBe("tsx")
    expect(payload.prevSourceSnapshot).toBe("old source")
    expect(payload.nextSourceSnapshot).toBe(newSource)
    expect(payload.appliedMutations).toBe(1)
    expect(payload.canvasIdMap).toEqual({ "abc:0": "abc:0" })
    expect(payload.mutations).toEqual([{ type: "setClassName", value: "w-32 h-16" }])
    expect(payload.mtimeMs).toBe(1234)
  })

  it("onWriteSuccess falls back to the local inline source when the endpoint omits prevSourceSnapshot", async () => {
    const newHtml = "<button class='w-32 h-16'>x</button>"
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "button",
          attributes: [
            { name: "class", kind: "literal-string", value: "w-24 h-10", rawValue: '"w-24 h-10"' },
          ],
          textChildren: "x",
        },
      }),
      mockJson({ ok: true, sourceHtml: newHtml, mtimeMs: 4321 })
    )
    const onWriteSuccess = vi.fn()
    await dispatchCanvasResize(makeEvent(), {
      sourceKind: "html",
      sourceId: "item-1",
      sourceHtml: "<button class='w-24 h-10'>x</button>",
      fetchImpl,
      onWriteSuccess,
    })
    expect(onWriteSuccess).toHaveBeenCalledTimes(1)
    const payload = onWriteSuccess.mock.calls[0][0]
    expect(payload.prevSourceSnapshot).toBe("<button class='w-24 h-10'>x</button>")
    expect(payload.nextSourceSnapshot).toBe(newHtml)
  })

  it("does not fire onWriteSuccess on write error", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "button",
          attributes: [
            { name: "className", kind: "literal-string", value: "w-24 h-10", rawValue: '"w-24 h-10"' },
          ],
          textChildren: "x",
        },
      }),
      mockJson({ ok: false, error: "write failed" }, false)
    )
    const onWriteSuccess = vi.fn()
    const result = await dispatchCanvasResize(makeEvent(), {
      sourceKind: "tsx",
      sourceId: "item-1",
      sourceReact: "x",
      fetchImpl,
      onWriteSuccess,
    })
    expect(result.status).toBe("error")
    expect(onWriteSuccess).not.toHaveBeenCalled()
  })

  it("does not fire onWriteSuccess on no-op (move handle)", async () => {
    const onWriteSuccess = vi.fn()
    const result = await dispatchCanvasResize(makeEvent({ kind: "move" }), {
      sourceKind: "tsx",
      sourceId: "item-1",
      sourceReact: "x",
      fetchImpl: vi.fn() as unknown as typeof fetch,
      onWriteSuccess,
    })
    expect(result.status).toBe("no-op")
    expect(onWriteSuccess).not.toHaveBeenCalled()
  })
})
