import { describe, expect, it } from "vitest"

import { mergeRecentCallsById } from "../components/canvas/CanvasMcpAppToolPalette"

describe("mergeRecentCallsById", () => {
  it("preserves prior records that are missing from a stale snapshot", () => {
    const prior = [
      { id: "a", nodeId: "n", toolName: "t", status: "success", startedAt: "2026-05-26T10:00:00Z" },
      { id: "b", nodeId: "n", toolName: "t", status: "success", startedAt: "2026-05-26T10:01:00Z" },
    ] as any
    // Simulate a SLOW response that returns a snapshot taken before "b"
    // existed — wholesale replace would drop "b".
    const staleSnapshot = [
      { id: "a", nodeId: "n", toolName: "t", status: "success", startedAt: "2026-05-26T10:00:00Z" },
    ] as any
    const merged = mergeRecentCallsById(prior, staleSnapshot)
    expect(merged.map((r) => r.id).sort()).toEqual(["a", "b"])
  })

  it("does not let a stale snapshot demote a completed record back to running", () => {
    const prior = [
      { id: "a", nodeId: "n", toolName: "t", status: "success", startedAt: "2026-05-26T10:00:00Z" },
    ] as any
    const stale = [
      { id: "a", nodeId: "n", toolName: "t", status: "running", startedAt: "2026-05-26T10:00:00Z" },
    ] as any
    const merged = mergeRecentCallsById(prior, stale)
    expect(merged[0]!.status).toBe("success")
  })

  it("caps merged output at 100 records and orders newest first", () => {
    const prior = Array.from({ length: 60 }, (_, i) => ({
      id: `p${i}`,
      nodeId: "n",
      toolName: "t",
      status: "success" as const,
      startedAt: `2026-05-26T10:00:${String(i).padStart(2, "0")}Z`,
    }))
    const next = Array.from({ length: 60 }, (_, i) => ({
      id: `n${i}`,
      nodeId: "n",
      toolName: "t",
      status: "success" as const,
      startedAt: `2026-05-26T11:00:${String(i).padStart(2, "0")}Z`,
    }))
    const merged = mergeRecentCallsById(prior as any, next as any)
    expect(merged.length).toBe(100)
    expect(merged[0]!.startedAt > merged[merged.length - 1]!.startedAt).toBe(true)
  })
})
