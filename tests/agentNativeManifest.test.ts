import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  AGENT_NATIVE_RUNTIME_DEFINITIONS,
  AGENT_NATIVE_WORKSPACE_DEFINITIONS,
  buildAgentNativeManifest,
} from "../utils/agentNativeManifest"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

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
    expect(canvasWorkspace?.entities).toContain("mcp-app")
    expect(canvasWorkspace?.resources.some((resource) => resource.id === "canvas-state")).toBe(true)
    expect(canvasWorkspace?.resources.some((resource) => resource.id === "canvas-themes")).toBe(true)
    expect(canvasWorkspace?.resources.some((resource) => resource.id === "canvas-events")).toBe(true)
    expect(canvasWorkspace?.resources.some((resource) => resource.id === "canvas-debug")).toBe(true)
    expect(
      canvasWorkspace?.resources.some((resource) => resource.id === "project-canvas-files")
    ).toBe(true)
    expect(
      canvasWorkspace?.resources.find((resource) => resource.id === "canvas-viewport-screenshot")?.status
    ).toBe("ready")
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "create_item")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "create_items")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "create_native_component_shell")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "insert_native_slot_part")).toBe(true)

    // U7: create_native_component_shell description reflects the shipped
    // file-backed + extended-template behavior (not the old inline copy).
    const nativeShellTool = canvasWorkspace?.tools.find(
      (tool) => tool.id === "create_native_component_shell"
    )
    expect(nativeShellTool?.status).toBe("ready")
    expect(nativeShellTool?.description).toContain("FILE-BACKED")
    expect(nativeShellTool?.description).toContain("layout primitive")
    expect(nativeShellTool?.description).toContain("element part")

    // U7: the new allowlisted sync_to_project tool is present, ready, and
    // marked destructive (it writes outside the repo).
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "sync_to_project")).toBe(true)
    const syncToProjectTool = canvasWorkspace?.tools.find(
      (tool) => tool.id === "sync_to_project"
    )
    expect(syncToProjectTool?.status).toBe("ready")
    expect(syncToProjectTool?.destructive).toBe(true)
    expect(syncToProjectTool?.description).toContain("allowlist")
    expect(syncToProjectTool?.description).toContain("meta.syncTarget")
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "create_group")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "list_canvas_files")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "save_canvas_file")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "move_canvas_file")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "duplicate_canvas_file")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "delete_canvas_file")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "get_canvas_themes")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "set_canvas_viewport")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "focus_canvas_items")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "capture_canvas_items_screenshot")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "register_mcp_app")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "list_mcp_app_tools")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "invoke_mcp_app_tool")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "get_mcp_app_log")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "disconnect_mcp_app")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "get_workspace_events")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "get_workspace_debug")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "duplicate_items")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "set_canvas_active_theme")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "undo_source_mutation")).toBe(true)
    expect(canvasWorkspace?.tools.some((tool) => tool.id === "redo_source_mutation")).toBe(true)
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

  // Parity guard for the 2026-05-23 agent-canvas coverage audit: the stdio MCP
  // server and the manifest advertise the same tool surface, so drift between
  // them fails here instead of resurfacing in a future audit.
  it("stays in parity with the stdio MCP server tool surface", () => {
    const serverSource = readFileSync(resolve(repoRoot, "bin/canvas-mcp-server"), "utf8")
    // Tool registrations are the only single-quoted snake_case `name:` entries
    // in the server source (the server id and resource titles don't match).
    const serverToolNames = new Set(
      Array.from(serverSource.matchAll(/name: '([a-z_]+)'/g), (match) => match[1])
    )
    expect(serverToolNames.size).toBeGreaterThan(50)

    const manifestToolsById = new Map(
      AGENT_NATIVE_WORKSPACE_DEFINITIONS.flatMap((workspace) =>
        workspace.tools.map((tool) => [tool.id, tool] as const)
      )
    )

    const missingFromManifest = [...serverToolNames].filter((name) => !manifestToolsById.has(name))
    expect(missingFromManifest).toEqual([])

    // Manifest entries may lead the server only when they say so: anything
    // marked "ready" must actually be callable over stdio MCP.
    const readyButMissingFromServer = [...manifestToolsById.values()]
      .filter((tool) => tool.status === "ready" && !serverToolNames.has(tool.id))
      .map((tool) => tool.id)
    expect(readyButMissingFromServer).toEqual([])
  })
})
