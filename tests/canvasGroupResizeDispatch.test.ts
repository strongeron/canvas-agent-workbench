import { describe, expect, it, vi } from "vitest"

import { dispatchCanvasGroupResize } from "../utils/canvasGroupResizeDispatch"

function mockJson(value: unknown, ok = true) {
  return { ok, json: async () => value } as Response
}

function mockFetchSequence(...responses: Response[]): typeof fetch {
  const queue = [...responses]
  return vi.fn(async () => {
    const next = queue.shift()
    if (!next) throw new Error("mockFetchSequence exhausted")
    return next
  }) as unknown as typeof fetch
}

const TARGETS = [
  { canvasId: "a:0", rect: { x: 0, y: 0, width: 100, height: 40 } },
  { canvasId: "b:0", rect: { x: 0, y: 0, width: 100, height: 40 } },
]

describe("dispatchCanvasGroupResize", () => {
  it("treats move as a no-op for every target without touching the network", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const result = await dispatchCanvasGroupResize(
      { kind: "move", deltaIframe: { dx: 10, dy: 10 }, targets: TARGETS },
      { sourceKind: "tsx", sourceId: "i", sourceReact: "x", fetchImpl }
    )
    expect(result).toEqual({ applied: 0, skipped: 2, errors: [] })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("applies a resize to every target and threads source forward, emitting one final change", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({ ok: true, node: { canvasId: "a:0", tag: "div", attributes: [], textChildren: "" } }),
      mockJson({ ok: true, sourceReact: "after-a", mtimeMs: 11 }),
      mockJson({ ok: true, node: { canvasId: "b:0", tag: "div", attributes: [], textChildren: "" } }),
      mockJson({ ok: true, sourceReact: "after-b", mtimeMs: 12 })
    )
    const onSourceReactChange = vi.fn()
    const result = await dispatchCanvasGroupResize(
      { kind: "se", deltaIframe: { dx: 28, dy: 24 }, targets: TARGETS },
      { sourceKind: "tsx", sourceId: "i", sourceReact: "before", fetchImpl, onSourceReactChange }
    )
    expect(result.applied).toBe(2)
    expect(result.errors).toEqual([])
    // Final source change fired exactly once, with the LAST write's source+mtime.
    expect(onSourceReactChange).toHaveBeenCalledTimes(1)
    expect(onSourceReactChange).toHaveBeenCalledWith("after-b", 12)
    // The second read/write must see the threaded source from write #1.
    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls
    const secondRead = JSON.parse(calls[2][1].body)
    expect(secondRead.sourceReact).toBe("after-a")
  })

  it("skips targets whose className is a non-literal expression", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({
        ok: true,
        node: {
          canvasId: "a:0",
          tag: "div",
          attributes: [
            { name: "className", kind: "expression", value: "cn('w-4', x && 'p-2')", rawValue: "" },
          ],
          textChildren: "",
        },
      }),
      mockJson({ ok: true, node: { canvasId: "b:0", tag: "div", attributes: [], textChildren: "" } }),
      mockJson({ ok: true, sourceReact: "after-b", mtimeMs: 5 })
    )
    const result = await dispatchCanvasGroupResize(
      { kind: "se", deltaIframe: { dx: 28, dy: 24 }, targets: TARGETS },
      { sourceKind: "tsx", sourceId: "i", sourceReact: "before", fetchImpl }
    )
    expect(result.applied).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it("collects per-target errors and still applies the rest (partial group)", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({ ok: true, node: { canvasId: "a:0", tag: "div", attributes: [], textChildren: "" } }),
      mockJson({ ok: false, error: "boom", code: "mtime-conflict" }, false),
      mockJson({ ok: true, node: { canvasId: "b:0", tag: "div", attributes: [], textChildren: "" } }),
      mockJson({ ok: true, sourceReact: "after-b", mtimeMs: 9 })
    )
    const onSourceReactChange = vi.fn()
    const result = await dispatchCanvasGroupResize(
      { kind: "se", deltaIframe: { dx: 28, dy: 24 }, targets: TARGETS },
      { sourceKind: "tsx", sourceId: "i", sourceReact: "before", fetchImpl, onSourceReactChange }
    )
    expect(result.applied).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("changed on disk")
    expect(onSourceReactChange).toHaveBeenCalledWith("after-b", 9)
  })

  it("does not emit a source change when nothing applied", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({ ok: false, error: "read failed" }, false),
      mockJson({ ok: false, error: "read failed" }, false)
    )
    const onSourceReactChange = vi.fn()
    const result = await dispatchCanvasGroupResize(
      { kind: "se", deltaIframe: { dx: 28, dy: 24 }, targets: TARGETS },
      { sourceKind: "tsx", sourceId: "i", sourceReact: "before", fetchImpl, onSourceReactChange }
    )
    expect(result.applied).toBe(0)
    expect(result.errors).toHaveLength(2)
    expect(onSourceReactChange).not.toHaveBeenCalled()
  })

  it("threads mtime for file-backed sources between writes", async () => {
    const fetchImpl = mockFetchSequence(
      mockJson({ ok: true, node: { canvasId: "a:0", tag: "div", attributes: [], textChildren: "" } }),
      mockJson({ ok: true, sourceReact: "after-a", mtimeMs: 100 }),
      mockJson({ ok: true, node: { canvasId: "b:0", tag: "div", attributes: [], textChildren: "" } }),
      mockJson({ ok: true, sourceReact: "after-b", mtimeMs: 200 })
    )
    await dispatchCanvasGroupResize(
      { kind: "se", deltaIframe: { dx: 28, dy: 24 }, targets: TARGETS },
      {
        sourceKind: "tsx",
        sourceId: "App.tsx",
        filePath: "App.tsx",
        mtimeMs: 50,
        fetchImpl,
      }
    )
    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls
    const firstWrite = JSON.parse(calls[1][1].body)
    const secondWrite = JSON.parse(calls[3][1].body)
    expect(firstWrite.mtimeMs).toBe(50)
    expect(secondWrite.mtimeMs).toBe(100)
  })
})
