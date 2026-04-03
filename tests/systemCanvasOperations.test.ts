import { describe, expect, it } from "vitest"

import { applySystemCanvasGraphOperation } from "../utils/systemCanvasOperations"

describe("system canvas graph operations", () => {
  it("creates, updates, and deletes system nodes and edges with deterministic ids", () => {
    const createdState = applySystemCanvasGraphOperation(undefined, {
      type: "create-node",
      node: {
        id: "system-node-1",
        type: "component",
        label: "Agent Preview",
        position: { x: 120, y: 80 },
        preview: {
          kind: "layout-grid",
          sectionId: "layout",
          title: "Agent Grid",
        },
      },
    })

    expect(createdState.nodes).toHaveLength(1)
    expect(createdState.nodes[0]?.id).toBe("system-node-1")
    expect(createdState.nodes[0]?.group).toBe("system-preview")

    const withSupportNode = applySystemCanvasGraphOperation(createdState, {
      type: "create-node",
      node: {
        id: "system-node-2",
        type: "semantic",
        label: "Agent Support",
        role: "surface",
        group: "system-support",
        position: { x: 340, y: 80 },
      },
    })

    const withEdge = applySystemCanvasGraphOperation(withSupportNode, {
      type: "create-edge",
      edge: {
        id: "system-edge-1",
        sourceId: "system-node-2",
        targetId: "system-node-1",
        type: "map",
        rule: {
          note: "Support -> preview",
        },
      },
    })

    expect(withEdge.edges).toHaveLength(1)
    expect(withEdge.edges[0]?.id).toBe("system-edge-1")

    const updatedNodeState = applySystemCanvasGraphOperation(withEdge, {
      type: "update-node",
      nodeId: "system-node-1",
      patch: {
        label: "Agent Preview Updated",
        position: { x: 420, y: 140 },
      },
    })

    expect(updatedNodeState.nodes.find((node) => node.id === "system-node-1")?.label).toBe(
      "Agent Preview Updated"
    )
    expect(updatedNodeState.nodes.find((node) => node.id === "system-node-1")?.position).toEqual({
      x: 420,
      y: 140,
    })

    const updatedEdgeState = applySystemCanvasGraphOperation(updatedNodeState, {
      type: "update-edge",
      edgeId: "system-edge-1",
      patch: {
        rule: {
          note: "Updated note",
        },
      },
    })

    expect(updatedEdgeState.edges[0]?.rule?.note).toBe("Updated note")

    const deletedNodeState = applySystemCanvasGraphOperation(updatedEdgeState, {
      type: "delete-node",
      nodeId: "system-node-2",
    })

    expect(deletedNodeState.nodes.some((node) => node.id === "system-node-2")).toBe(false)
    expect(deletedNodeState.edges).toHaveLength(0)
  })
})
