import { describe, expect, it } from "vitest"

import {
  AGENT_NATIVE_RUNTIME_DEFINITIONS,
  AGENT_NATIVE_WORKSPACE_DEFINITIONS,
  buildAgentNativeManifest,
} from "../utils/agentNativeManifest"

describe("agent native manifest", () => {
  it("exposes supported runtimes", () => {
    expect(AGENT_NATIVE_RUNTIME_DEFINITIONS.map((runtime) => runtime.id)).toEqual([
      "codex",
      "claude",
    ])
  })

  it("describes current app workspaces and bridge status", () => {
    const manifest = buildAgentNativeManifest()
    expect(manifest.version).toBe(1)
    expect(typeof manifest.updatedAt).toBe("string")
    expect(manifest.workspaces.map((workspace) => workspace.id)).toEqual([
      "canvas",
      "color-audit",
      "system-canvas",
      "node-catalog",
    ])

    const canvasWorkspace = AGENT_NATIVE_WORKSPACE_DEFINITIONS.find(
      (workspace) => workspace.id === "canvas"
    )
    expect(canvasWorkspace?.syncMode).toBe("live-bridge")
    expect(canvasWorkspace?.mutationMode).toBe("event-log")
    expect(canvasWorkspace?.entities).toContain("mermaid")
    expect(canvasWorkspace?.entities).toContain("excalidraw")
    expect(canvasWorkspace?.resources.some((resource) => resource.id === "canvas-state")).toBe(true)
    expect(canvasWorkspace?.resources.some((resource) => resource.id === "canvas-events")).toBe(true)
    expect(canvasWorkspace?.resources.some((resource) => resource.id === "canvas-debug")).toBe(true)
    expect(
      canvasWorkspace?.resources.some((resource) => resource.id === "project-canvas-files")
    ).toBe(true)
    expect(
      canvasWorkspace?.resources.find((resource) => resource.id === "canvas-viewport-screenshot")?.status
    ).toBe("ready")
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "create_item")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "list_canvas_files")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "save_canvas_file")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "move_canvas_file")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "duplicate_canvas_file")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "delete_canvas_file")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "get_workspace_events")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "get_workspace_debug")).toBe(true)
    expect(
      canvasWorkspace?.tools.find((tool) => tool.id === "capture_workspace_screenshot")?.status
    ).toBe("ready")

    const colorAuditWorkspace = AGENT_NATIVE_WORKSPACE_DEFINITIONS.find(
      (workspace) => workspace.id === "color-audit"
    )
    expect(colorAuditWorkspace?.syncMode).toBe("live-bridge")
    expect(colorAuditWorkspace?.mutationMode).toBe("event-log")
    expect(
      colorAuditWorkspace?.resources.some((resource) => resource.id === "color-audit-state")
    ).toBe(true)
    expect(
      colorAuditWorkspace?.resources.find((resource) => resource.id === "color-audit-state")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.resources.find((resource) => resource.id === "project-canvas-files")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.resources.find((resource) => resource.id === "color-audit-events")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.resources.find((resource) => resource.id === "color-audit-debug")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "get_color_audit_state")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "save_canvas_file")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "move_canvas_file")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "duplicate_canvas_file")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "delete_canvas_file")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "get_workspace_events")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "get_workspace_debug")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "get_color_audit_export_preview")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.some((tool) => tool.id === "create_color_node")
    ).toBe(true)
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "create_color_node")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "generate_template")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.tools.find((tool) => tool.id === "create_color_edge")?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.resources.find((resource) => resource.id === "color-audit-export-preview")
        ?.status
    ).toBe("ready")
    expect(
      colorAuditWorkspace?.resources.find((resource) => resource.id === "color-audit-viewport-screenshot")
        ?.status
    ).toBe("ready")

    const systemCanvasWorkspace = AGENT_NATIVE_WORKSPACE_DEFINITIONS.find(
      (workspace) => workspace.id === "system-canvas"
    )
    expect(systemCanvasWorkspace?.syncMode).toBe("live-bridge")
    expect(systemCanvasWorkspace?.mutationMode).toBe("event-log")
    expect(systemCanvasWorkspace?.capabilities).toContain("generate-scale-graph")
    expect(systemCanvasWorkspace?.capabilities).toContain("apply-scale-vars")
    expect(
      systemCanvasWorkspace?.resources.find((resource) => resource.id === "system-canvas-state")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.resources.find((resource) => resource.id === "project-canvas-files")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.resources.find((resource) => resource.id === "system-canvas-events")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.resources.find((resource) => resource.id === "system-canvas-debug")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.resources.find((resource) => resource.id === "system-canvas-viewport-screenshot")
        ?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "get_system_canvas_state")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "list_canvas_files")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "move_canvas_file")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "duplicate_canvas_file")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "delete_canvas_file")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "get_workspace_events")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "get_workspace_debug")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "generate_scale_graph")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "apply_scale_vars")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "update_system_scale_config")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "set_system_canvas_view")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "create_system_node")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "update_system_node")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "delete_system_node")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "create_system_edge")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "update_system_edge")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.tools.find((tool) => tool.id === "delete_system_edge")?.status
    ).toBe("ready")
    expect(
      systemCanvasWorkspace?.prompts.find((prompt) => prompt.id === "review-scale-system")?.status
    ).toBe("ready")

    const nodeCatalogWorkspace = AGENT_NATIVE_WORKSPACE_DEFINITIONS.find(
      (workspace) => workspace.id === "node-catalog"
    )
    expect(nodeCatalogWorkspace?.route).toBe("/node-catalog")
    expect(nodeCatalogWorkspace?.syncMode).toBe("live-bridge")
    expect(nodeCatalogWorkspace?.mutationMode).toBe("none")
    expect(nodeCatalogWorkspace?.capabilities).toContain("read-state")
    expect(
      nodeCatalogWorkspace?.resources.find((resource) => resource.id === "node-catalog-state")?.status
    ).toBe("ready")
    expect(
      nodeCatalogWorkspace?.resources.find((resource) => resource.id === "node-catalog-events")?.status
    ).toBe("ready")
    expect(
      nodeCatalogWorkspace?.resources.find((resource) => resource.id === "node-catalog-debug")?.status
    ).toBe("ready")
    expect(
      nodeCatalogWorkspace?.resources.find((resource) => resource.id === "node-catalog-sections")?.status
    ).toBe("ready")
    expect(
      nodeCatalogWorkspace?.resources.find((resource) => resource.id === "node-catalog-viewport-screenshot")
        ?.status
    ).toBe("ready")
    expect(
      nodeCatalogWorkspace?.tools.find((tool) => tool.id === "get_node_catalog_state")?.status
    ).toBe("ready")
    expect(
      nodeCatalogWorkspace?.tools.find((tool) => tool.id === "get_workspace_events")?.status
    ).toBe("ready")
    expect(
      nodeCatalogWorkspace?.tools.find((tool) => tool.id === "get_workspace_debug")?.status
    ).toBe("ready")
    expect(nodeCatalogWorkspace?.prompts.some((prompt) => prompt.id === "review-node-system")).toBe(
      true
    )
    expect(
      nodeCatalogWorkspace?.prompts.find((prompt) => prompt.id === "review-node-system")?.status
    ).toBe("ready")
  })
})
