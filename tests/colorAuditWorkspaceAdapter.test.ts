import { describe, expect, it } from "vitest"

import {
  buildColorAuditWorkspaceManifest,
  buildColorAuditWorkspaceStateResource,
} from "../utils/colorAuditWorkspaceAdapter"

describe("color audit workspace adapter", () => {
  it("builds a workspace manifest with the current state summary", () => {
    const manifest = buildColorAuditWorkspaceManifest({
      stateSummary: {
        nodeCount: 12,
        edgeCount: 9,
        selection: ["node-1"],
        viewport: { x: 24, y: 36, zoom: 0.75 },
      },
    })

    expect(manifest?.surface).toBe("color-audit")
    expect(manifest?.currentState.nodeCount).toBe(12)
    expect(manifest?.currentState.edgeCount).toBe(9)
    expect(manifest?.currentState.selection).toEqual(["node-1"])
    expect(manifest?.resources.some((resource) => resource.id === "color-audit-state")).toBe(true)
  })

  it("serializes read-only color audit state with export preview", () => {
    const resource = buildColorAuditWorkspaceStateResource({
      workspaceKey: "gallery-demo:color-audit",
      rawState: {
        nodes: [],
        edges: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        edgeUndoStack: [],
      },
      stateSummary: {
        nodeCount: 3,
        edgeCount: 2,
        selection: ["node-2", "edge-1"],
      },
      selectedNodeId: "node-2",
      selectedEdgeId: "edge-1",
      workflow: {
        inputs: 1,
        relativeRules: 1,
        functionalAliases: 1,
        semanticRoles: 2,
        mappedSemanticRoles: 1,
        exportableTokens: 2,
        textRoleReady: true,
        surfaceRoleReady: true,
        contrastPairs: 1,
        frameworkAliasesReady: 1,
        genericReady: true,
        frameworkReady: true,
      },
      nodes: [
        {
          id: "node-1",
          type: "token",
          label: "Brand Seed",
          cssVar: "--color-brand-500",
          position: { x: 120, y: 160 },
          resolvedExpression: "oklch(60% 0.16 250)",
          resolvedColor: "rgb(80 120 240)",
          isDisplayP3: false,
        },
      ],
      edges: [
        {
          id: "edge-1",
          type: "map",
          sourceId: "node-1",
          targetId: "node-2",
          sourceLabel: "Brand Seed",
          targetLabel: "Background",
        },
      ],
      exportEntries: [
        {
          id: "node-2",
          label: "Background",
          cssVar: "--background",
          exportKey: "background",
          family: "functional",
          framework: "shadcn",
          semanticKind: "functional",
          resolvedExpression: "oklch(98% 0.01 250)",
          oklchExpression: "oklch(98% 0.01 250)",
        },
      ],
      exportPreview: {
        selectedFormat: "css-vars",
        selectedColorMode: "oklch",
        selectedFormatLabel: "CSS vars",
        tokenCount: 1,
        genericReady: true,
        frameworkReady: true,
        formats: {
          "css-vars": ":root {\n  --background: oklch(98% 0.01 250);\n}",
          dtcg: '{\n  "color": {}\n}',
          tailwind: "export default {}",
          shadcn: ":root {\n  --background: oklch(98% 0.01 250);\n}",
          radix: "/* No mapped Radix aliases are ready to export yet. */",
        },
      },
    })

    expect(resource.surface).toBe("color-audit")
    expect(resource.rawState.nodes).toEqual([])
    expect(resource.selection.selectedNodeId).toBe("node-2")
    expect(resource.exportPreview.selectedColorMode).toBe("oklch")
    expect(resource.exportPreview.formats["css-vars"]).toContain("--background")
    expect(resource.nodes[0]?.label).toBe("Brand Seed")
  })
})
