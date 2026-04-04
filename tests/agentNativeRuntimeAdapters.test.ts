import { describe, expect, it } from "vitest"

import {
  AGENT_NATIVE_RUNTIME_ADAPTERS,
  CANVAS_AGENT_RUNTIME_MCP_GUIDANCE,
  getAgentNativeRuntimeAdapter,
  listCanvasAgentDefinitions,
} from "../utils/agentNativeRuntimeAdapters"

describe("agent native runtime adapters", () => {
  const launchContext = {
    session: {
      cwd: "/tmp/gallery-poc",
      projectId: "demo",
    },
    sessionDir: "/tmp/gallery-poc/.canvas-agent/session-1",
    toolCommand: "bin/canvas-agent",
    serverUrl: "http://127.0.0.1:5178",
    mcpServerName: "canvas",
    mcpServerEntry: "/tmp/gallery-poc/bin/canvas-mcp-server",
    mcpEnv: {
      CANVAS_AGENT_PROJECT_ID: "demo",
      CANVAS_AGENT_SERVER_URL: "http://127.0.0.1:5178",
    },
  } as const

  it("registers the supported runtime adapters", () => {
    expect(AGENT_NATIVE_RUNTIME_ADAPTERS.map((adapter) => adapter.id)).toEqual([
      "codex",
      "claude",
    ])
  })

  it("describes runtime-facing agent metadata for the app panel", () => {
    expect(listCanvasAgentDefinitions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "codex",
          transport: "pty",
          mcpSupport: "native",
          configScope: "global",
          configMode: "inline-overrides",
          startupMode: "inline-bootstrap",
        }),
        expect.objectContaining({
          id: "claude",
          transport: "pty",
          mcpSupport: "native",
          configScope: "project",
          configMode: "strict-config-file",
          startupMode: "append-system-prompt",
        }),
      ])
    )
  })

  it("builds codex launch metadata with inline MCP overrides", () => {
    const adapter = getAgentNativeRuntimeAdapter("codex")
    expect(adapter).not.toBeNull()

    const launch = adapter!.buildLaunchMetadata(launchContext)

    expect(launch.agentCommand).toContain("codex")
    expect(launch.agentCommand).toContain("mcp_servers.canvas.command=")
    expect(launch.agentCommand).toContain("mcp_servers.canvas.args=")
    expect(launch.agentCommand).toContain("mcp_servers.canvas.env=")
    expect(launch.agentCommand).toContain(
      "Acknowledge briefly that the canvas MCP tools are available"
    )
    expect(launch.launchCommand).toContain('cd "/tmp/gallery-poc"')
    expect(launch.mcpConfigPath).toBeNull()
    expect(launch.mcpConfigContent).toBeNull()
    expect(launch.startupGuidance).toBe(CANVAS_AGENT_RUNTIME_MCP_GUIDANCE)
  })

  it("builds claude launch metadata with a strict MCP config file", () => {
    const adapter = getAgentNativeRuntimeAdapter("claude")
    expect(adapter).not.toBeNull()

    const launch = adapter!.buildLaunchMetadata(launchContext)

    expect(launch.agentCommand).toContain("claude")
    expect(launch.agentCommand).toContain("--append-system-prompt")
    expect(launch.agentCommand).toContain("--strict-mcp-config")
    expect(launch.agentCommand).toContain("--mcp-config")
    expect(launch.launchCommand).toContain('cd "/tmp/gallery-poc"')
    expect(launch.mcpConfigPath).toBe(
      "/tmp/gallery-poc/.canvas-agent/session-1/canvas-mcp.json"
    )
    expect(launch.mcpConfigContent).toContain('"canvas"')
    expect(launch.mcpConfigContent).toContain('"type": "stdio"')
    expect(launch.startupGuidance).toBe(CANVAS_AGENT_RUNTIME_MCP_GUIDANCE)
  })
})
