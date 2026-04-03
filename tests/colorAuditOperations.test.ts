import { describe, expect, it } from "vitest"

import { applyColorAuditOperation } from "../utils/colorAuditOperations"
import type { ColorCanvasState } from "../types/colorCanvas"

const EMPTY_STATE: ColorCanvasState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  edgeUndoStack: [],
}

describe("color audit operations", () => {
  it("creates, updates, and deletes nodes", () => {
    const created = applyColorAuditOperation(EMPTY_STATE, {
      type: "create-node",
      node: {
        type: "token",
        label: "Brand Seed",
        cssVar: "--color-brand-500",
        value: "oklch(62% 0.19 255)",
        position: { x: 120, y: 80 },
      },
    })

    expect(created.nodes).toHaveLength(1)
    expect(created.selectedNodeId).toBe(created.nodes[0]?.id)

    const updated = applyColorAuditOperation(created, {
      type: "update-node",
      nodeId: created.nodes[0]!.id,
      patch: {
        label: "Brand / 500",
      },
    })

    expect(updated.nodes[0]?.label).toBe("Brand / 500")

    const deleted = applyColorAuditOperation(updated, {
      type: "delete-node",
      nodeId: created.nodes[0]!.id,
    })

    expect(deleted.nodes).toHaveLength(0)
    expect(deleted.selectedNodeId).toBeNull()
  })

  it("creates, updates, and deletes edges", () => {
    const withNodes = applyColorAuditOperation(
      applyColorAuditOperation(EMPTY_STATE, {
        type: "create-node",
        node: {
          type: "token",
          label: "Brand Seed",
          cssVar: "--color-brand-500",
          value: "oklch(62% 0.19 255)",
          position: { x: 120, y: 80 },
        },
      }),
      {
        type: "create-node",
        node: {
          type: "semantic",
          label: "Background",
          cssVar: "--background",
          framework: "shadcn",
          semanticKind: "functional",
          role: "surface",
          position: { x: 380, y: 80 },
        },
      }
    )

    const [sourceNode, targetNode] = withNodes.nodes
    const created = applyColorAuditOperation(withNodes, {
      type: "create-edge",
      edge: {
        sourceId: sourceNode!.id,
        targetId: targetNode!.id,
        type: "map",
        rule: { note: "shadcn/ui token" },
      },
    })

    expect(created.edges).toHaveLength(1)
    expect(created.selectedEdgeId).toBe(created.edges[0]?.id)

    const updated = applyColorAuditOperation(created, {
      type: "update-edge",
      edgeId: created.edges[0]!.id,
      patch: {
        rule: {
          note: "Semantic role",
        },
      },
    })

    expect(updated.edges[0]?.rule?.note).toBe("Semantic role")

    const deleted = applyColorAuditOperation(updated, {
      type: "delete-edge",
      edgeId: updated.edges[0]!.id,
    })

    expect(deleted.edges).toHaveLength(0)
    expect(deleted.edgeUndoStack).toHaveLength(1)
  })

  it("generates a starter template graph", () => {
    const generated = applyColorAuditOperation(EMPTY_STATE, {
      type: "generate-template",
      templateKitId: "starter",
      brandColor: "oklch(62% 0.19 255)",
    })

    expect(generated.nodes.some((node) => node.label === "Brand Seed")).toBe(true)
    expect(generated.nodes.some((node) => node.label === "Surface / Base")).toBe(true)
    expect(generated.nodes.some((node) => node.label === "Text / Foreground")).toBe(true)
    expect(generated.edges.some((edge) => edge.type === "map")).toBe(true)
    expect(generated.selectedNodeId).toBeNull()
    expect(generated.selectedEdgeId).toBeNull()
  })
})
