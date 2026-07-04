import { describe, expect, it } from "vitest"

import {
  AGENT_NATIVE_RUNTIME_ADAPTERS,
  buildCanvasAgentSessionDraft,
  CANVAS_AGENT_RUNTIME_MCP_GUIDANCE,
  getAgentNativeRuntimeAdapter,
  listCanvasAgentDefinitions,
  resolveAgentRuntimeSpawn,
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
          configScope: "session",
          configMode: "strict-config-file",
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

  it("builds lean codex launch metadata with an isolated session CODEX_HOME", () => {
    const adapter = getAgentNativeRuntimeAdapter("codex")
    expect(adapter).not.toBeNull()

    const launch = adapter!.buildLaunchMetadata(launchContext)

    expect(launch.agentCommand).toContain("CODEX_HOME=")
    expect(launch.agentCommand).toContain("codex-home")
    expect(launch.agentCommand).toContain('cp -f "$HOME/.codex/auth.json"')
    expect(launch.agentCommand).not.toContain("-c ")
    expect(launch.agentCommand).toContain(
      "Acknowledge briefly that the canvas MCP tools are available"
    )
    expect(launch.launchCommand).toContain('cd "/tmp/gallery-poc"')
    expect(launch.mcpConfigPath).toBe(
      "/tmp/gallery-poc/.canvas-agent/session-1/codex-home/config.toml"
    )
    expect(launch.mcpConfigContent).toContain("[mcp_servers.canvas]")
    expect(launch.mcpConfigContent).toContain("[mcp_servers.canvas.env]")
    expect(launch.mcpConfigContent).toContain(
      'CANVAS_AGENT_PROJECT_ID = "demo"'
    )
    expect(launch.mcpConfigContent).toContain('[projects."/tmp/gallery-poc"]')
    expect(launch.mcpConfigContent).toContain('trust_level = "trusted"')
    // Every canvas tool must be pre-approved — codex denies unapproved MCP
    // calls under non-interactive approval policies.
    expect(launch.mcpConfigContent).toContain(
      "[mcp_servers.canvas.tools.get_workspace_manifest]"
    )
    expect(launch.mcpConfigContent).toContain("[mcp_servers.canvas.tools.update_item]")
    expect(launch.mcpConfigContent?.match(/approval_mode = "approve"/g)?.length).toBeGreaterThan(
      90
    )
    expect(launch.startupGuidance).toBe(CANVAS_AGENT_RUNTIME_MCP_GUIDANCE)
  })

  it("builds full-profile codex launch metadata with inline MCP overrides", () => {
    const adapter = getAgentNativeRuntimeAdapter("codex")
    expect(adapter).not.toBeNull()

    const launch = adapter!.buildLaunchMetadata({
      ...launchContext,
      session: { ...launchContext.session, launchProfile: "full" },
    })

    expect(launch.agentCommand).toContain("codex")
    expect(launch.agentCommand).not.toContain("CODEX_HOME=")
    expect(launch.agentCommand).toContain("mcp_servers.canvas.command=")
    expect(launch.agentCommand).toContain("mcp_servers.canvas.args=")
    expect(launch.agentCommand).toContain("mcp_servers.canvas.env=")
    expect(launch.launchCommand).toContain('cd "/tmp/gallery-poc"')
    expect(launch.mcpConfigPath).toBeNull()
    expect(launch.mcpConfigContent).toBeNull()
  })

  it("builds lean claude launch metadata with strict MCP config and project setting sources", () => {
    const adapter = getAgentNativeRuntimeAdapter("claude")
    expect(adapter).not.toBeNull()

    const launch = adapter!.buildLaunchMetadata(launchContext)

    expect(launch.agentCommand).toContain("claude")
    expect(launch.agentCommand).toContain("--append-system-prompt")
    expect(launch.agentCommand).toContain("--strict-mcp-config")
    expect(launch.agentCommand).toContain("--mcp-config")
    expect(launch.agentCommand).toContain("--setting-sources project,local")
    expect(launch.agentCommand).toContain("--allowedTools mcp__canvas")
    expect(launch.launchCommand).toContain('cd "/tmp/gallery-poc"')
    expect(launch.mcpConfigPath).toBe(
      "/tmp/gallery-poc/.canvas-agent/session-1/canvas-mcp.json"
    )
    expect(launch.mcpConfigContent).toContain('"canvas"')
    expect(launch.mcpConfigContent).toContain('"type": "stdio"')
    expect(launch.startupGuidance).toBe(CANVAS_AGENT_RUNTIME_MCP_GUIDANCE)
  })

  it("builds full-profile claude launch metadata without strict config", () => {
    const adapter = getAgentNativeRuntimeAdapter("claude")
    expect(adapter).not.toBeNull()

    const launch = adapter!.buildLaunchMetadata({
      ...launchContext,
      session: { ...launchContext.session, launchProfile: "full" },
    })

    expect(launch.agentCommand).toContain("--mcp-config")
    expect(launch.agentCommand).not.toContain("--strict-mcp-config")
    expect(launch.agentCommand).not.toContain("--setting-sources")
    expect(launch.mcpConfigPath).toBe(
      "/tmp/gallery-poc/.canvas-agent/session-1/canvas-mcp.json"
    )
  })

  it("builds a configured session draft from the runtime adapter", () => {
    const adapter = getAgentNativeRuntimeAdapter("codex")
    expect(adapter).not.toBeNull()

    const draft = buildCanvasAgentSessionDraft(adapter!, {
      projectId: "demo",
      cwd: "/tmp/gallery-poc",
      now: "2026-04-04T10:00:00.000Z",
      toolCommand: "bin/canvas-agent",
      mcpServerName: "canvas",
      mcpServerEntry: "/tmp/gallery-poc/bin/canvas-mcp-server",
      defaultTerminal: { cols: 96, rows: 28 },
    })

    expect(draft).toMatchObject({
      projectId: "demo",
      agentId: "codex",
      agentLabel: "Codex CLI",
      cwd: "/tmp/gallery-poc",
      launchProfile: "lean",
      transport: "manual-cli",
      status: "configured",
      startupGuidance: CANVAS_AGENT_RUNTIME_MCP_GUIDANCE,
    })
  })

  it("resolves runtime spawn config for POSIX shells", () => {
    const adapter = getAgentNativeRuntimeAdapter("claude")
    expect(adapter).not.toBeNull()

    const spawnConfig = resolveAgentRuntimeSpawn(
      adapter!,
      {
        cwd: "/tmp/gallery-poc",
        agentCommand: "claude --strict-mcp-config",
      },
      {
        shell: "/bin/zsh",
        platform: "darwin",
        cwdFallback: "/fallback",
      }
    )

    expect(spawnConfig).toEqual({
      shell: "/bin/zsh",
      args: ["-lic", "claude --strict-mcp-config"],
      cwd: "/tmp/gallery-poc",
    })
  })
})
