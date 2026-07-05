import path from "path"

import type { AgentNativeRuntimeDefinition } from "../types/agentNative"
import type {
  CanvasAgentDefinition,
  CanvasAgentLaunchProfile,
  CanvasAgentSession,
} from "../types/canvas"
import { CANVAS_MCP_TOOL_NAMES } from "./canvasMcpToolNames"

export const CANVAS_AGENT_RUNTIME_MCP_GUIDANCE =
  'This session is attached to a live canvas MCP server named "canvas". Prefer MCP resources and tools before Bash when the task touches the app surfaces. Start with workspace://manifest or get_workspace_manifest. For the freeform Canvas surface, use get_canvas_context or get_canvas_state, inspect primitives with list_primitives or get_primitive, create boards with create_artboard, create_native_component_shell, create_primitive_item, and insert_native_slot_part, then use update_item/select_items as needed. For Color Audit review tasks, use get_color_audit_state and get_color_audit_export_preview. For System Canvas review tasks, use get_system_canvas_state. Use export_board only for primitive-only artboards. To observe what the human is doing, use get_workspace_events { workspaceId, sinceCursor? } — it returns an operation-shaped feed (user-action, source-edit, file-lifecycle, operation-queued, operation-applied, state-synced); loop poll -> act on new events -> poll again with sinceCursor set to the returned nextCursor. Use shell and file edits only for repo code changes, tests, or debugging outside the scene graph.'

export interface AgentNativeRuntimeLaunchMetadata {
  agentCommand: string
  launchCommand: string
  mcpServerName: string | null
  mcpServerCommand: string | null
  mcpConfigPath: string | null
  mcpConfigContent: string | null
  startupGuidance: string | null
}

export interface AgentNativeRuntimeLaunchContext {
  session: Pick<CanvasAgentSession, "cwd" | "projectId" | "launchProfile">
  sessionDir: string
  toolCommand: string
  serverUrl: string
  mcpServerName: string
  mcpServerEntry: string
  mcpEnv: Record<string, string>
}

export interface AgentNativeRuntimeSessionDraftInput {
  projectId: string
  cwd: string
  title?: string
  launchProfile?: CanvasAgentLaunchProfile
  now: string
  toolCommand: string
  mcpServerName: string
  mcpServerEntry: string
  defaultTerminal: {
    cols: number
    rows: number
  }
}

export function normalizeCanvasAgentLaunchProfile(value: unknown): CanvasAgentLaunchProfile {
  return value === "full" ? "full" : "lean"
}

export interface AgentNativeRuntimeAdapter extends AgentNativeRuntimeDefinition {
  configMode: "inline-overrides" | "strict-config-file"
  startupMode: "inline-bootstrap" | "append-system-prompt"
  startupGuidance: string
  guardNotes: string
  buildLaunchMetadata(context: AgentNativeRuntimeLaunchContext): AgentNativeRuntimeLaunchMetadata
  toCanvasAgentDefinition(): CanvasAgentDefinition
}

function shellQuote(value: string) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`
}

function formatTomlInlineTable(record: Record<string, string>) {
  return `{${Object.entries(record)
    .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
    .join(",")}}`
}

function buildClaudeCanvasMcpConfig(context: AgentNativeRuntimeLaunchContext) {
  return {
    mcpServers: {
      [context.mcpServerName]: {
        type: "stdio",
        command: process.execPath,
        args: [context.mcpServerEntry],
        env: context.mcpEnv,
      },
    },
  }
}

function buildCodexBootstrapPrompt(guidance: string) {
  return `${guidance} Acknowledge briefly that the canvas MCP tools are available, then wait for the next user task.`
}

/**
 * Minimal `config.toml` for an isolated session CODEX_HOME (lean profile):
 * only the canvas MCP server is wired and the session cwd is pre-trusted, so
 * the runtime never races the user's global MCP servers, skills, or plugins
 * for startup/context budget (FOX2-52).
 */
function buildCodexLeanHomeConfigToml(context: AgentNativeRuntimeLaunchContext) {
  return [
    "# Generated canvas lean launch profile — only the canvas MCP server is wired.",
    `[mcp_servers.${context.mcpServerName}]`,
    `command = ${JSON.stringify(process.execPath)}`,
    `args = [${JSON.stringify(context.mcpServerEntry)}]`,
    `cwd = ${JSON.stringify(context.session.cwd)}`,
    "",
    `[mcp_servers.${context.mcpServerName}.env]`,
    ...Object.entries(context.mcpEnv).map(
      ([key, value]) => `${key} = ${JSON.stringify(String(value))}`
    ),
    "",
    `[projects.${JSON.stringify(context.session.cwd)}]`,
    `trust_level = "trusted"`,
    "",
    // Without per-tool approval, codex's non-interactive/never approval
    // policies DENY MCP tool calls ("user cancelled MCP tool call") instead
    // of running them. Codex has no server-level approval_mode.
    ...CANVAS_MCP_TOOL_NAMES.flatMap((toolName) => [
      `[mcp_servers.${context.mcpServerName}.tools.${toolName}]`,
      `approval_mode = "approve"`,
    ]),
    "",
  ].join("\n")
}

function resolveCodexLeanHomeDir(sessionDir: string) {
  return path.join(sessionDir, "codex-home")
}

const codexRuntimeAdapter: AgentNativeRuntimeAdapter = {
  id: "codex",
  label: "Codex CLI",
  description: "OpenAI Codex CLI session in the current workspace.",
  launchCommand: "codex",
  transport: "pty",
  mcpSupport: "native",
  configScope: "session",
  status: "ready",
  configMode: "strict-config-file",
  startupMode: "inline-bootstrap",
  startupGuidance: CANVAS_AGENT_RUNTIME_MCP_GUIDANCE,
  guardNotes:
    "Lean profile (default) launches with an isolated session CODEX_HOME: only the canvas MCP server is wired, global skills/plugins/MCP servers stay out of the context budget, and auth is seeded from ~/.codex. Full profile keeps your global environment and adds the canvas server via inline overrides.",
  buildLaunchMetadata(context) {
    const bootstrapPrompt = buildCodexBootstrapPrompt(this.startupGuidance)
    const profile = normalizeCanvasAgentLaunchProfile(context.session.launchProfile)

    if (profile === "full") {
      const codexOverrides = [
        `mcp_servers.${context.mcpServerName}.command=${JSON.stringify(process.execPath)}`,
        `mcp_servers.${context.mcpServerName}.args=${JSON.stringify([context.mcpServerEntry])}`,
        `mcp_servers.${context.mcpServerName}.env=${formatTomlInlineTable(context.mcpEnv)}`,
        `mcp_servers.${context.mcpServerName}.cwd=${JSON.stringify(context.session.cwd)}`,
      ]
      const overrideArgs = codexOverrides.map((override) => `-c ${shellQuote(override)}`).join(" ")
      const agentCommand = `${this.launchCommand} ${overrideArgs} ${shellQuote(bootstrapPrompt)}`.trim()
      return {
        agentCommand,
        launchCommand: `cd ${JSON.stringify(context.session.cwd)} && ${agentCommand}`,
        mcpServerName: context.mcpServerName,
        mcpServerCommand: `${process.execPath} ${context.mcpServerEntry}`,
        mcpConfigPath: null,
        mcpConfigContent: null,
        startupGuidance: this.startupGuidance,
      }
    }

    const codexHomeDir = resolveCodexLeanHomeDir(context.sessionDir)
    const authSeedPath = path.join(codexHomeDir, "auth.json")
    // Auth lives inside CODEX_HOME, so each launch re-seeds the lean home from
    // the user's global auth (fresh tokens even for late external launches).
    // Codex profiles can only layer on top of the global config — an isolated
    // home is the only way to *exclude* global MCP servers/skills/plugins.
    const agentCommand = [
      `mkdir -p ${shellQuote(codexHomeDir)}`,
      `{ cp -f "$HOME/.codex/auth.json" ${shellQuote(authSeedPath)} 2>/dev/null || true; }`,
      `CODEX_HOME=${shellQuote(codexHomeDir)} ${this.launchCommand} ${shellQuote(bootstrapPrompt)}`,
    ].join(" && ")
    return {
      agentCommand,
      launchCommand: `cd ${JSON.stringify(context.session.cwd)} && ${agentCommand}`,
      mcpServerName: context.mcpServerName,
      mcpServerCommand: `${process.execPath} ${context.mcpServerEntry}`,
      mcpConfigPath: path.join(codexHomeDir, "config.toml"),
      mcpConfigContent: buildCodexLeanHomeConfigToml(context),
      startupGuidance: this.startupGuidance,
    }
  },
  toCanvasAgentDefinition() {
    return {
      id: this.id,
      label: this.label,
      description: this.description,
      launchCommand: this.launchCommand,
      transport: this.transport,
      mcpSupport: this.mcpSupport,
      configScope: this.configScope,
      status: this.status,
      configMode: this.configMode,
      startupMode: this.startupMode,
      guardNotes: this.guardNotes,
    }
  },
}

const claudeRuntimeAdapter: AgentNativeRuntimeAdapter = {
  id: "claude",
  label: "Claude Code",
  description: "Anthropic Claude Code session in the current workspace.",
  launchCommand: "claude",
  transport: "pty",
  mcpSupport: "native",
  configScope: "project",
  status: "ready",
  configMode: "strict-config-file",
  startupMode: "append-system-prompt",
  startupGuidance: CANVAS_AGENT_RUNTIME_MCP_GUIDANCE,
  guardNotes:
    "Lean profile (default) uses a session-scoped strict MCP config file plus --setting-sources project,local, so user-level skills/plugins/MCP servers stay out of the session. Full profile keeps your global environment and adds the canvas server on top.",
  buildLaunchMetadata(context) {
    const mcpConfigPath = path.join(context.sessionDir, "canvas-mcp.json")
    const profile = normalizeCanvasAgentLaunchProfile(context.session.launchProfile)
    const profileArgs =
      profile === "full"
        ? `--mcp-config ${shellQuote(mcpConfigPath)}`
        : `--strict-mcp-config --mcp-config ${shellQuote(mcpConfigPath)} --setting-sources project,local`
    // mcp__canvas (server-level rule) pre-allows every canvas tool so the
    // session doesn't stop for permission on each scene-graph operation.
    const agentCommand = `${this.launchCommand} --append-system-prompt ${shellQuote(this.startupGuidance)} --allowedTools mcp__${context.mcpServerName} ${profileArgs}`
    return {
      agentCommand,
      launchCommand: `cd ${JSON.stringify(context.session.cwd)} && ${agentCommand}`,
      mcpServerName: context.mcpServerName,
      mcpServerCommand: `${process.execPath} ${context.mcpServerEntry}`,
      mcpConfigPath,
      mcpConfigContent: JSON.stringify(buildClaudeCanvasMcpConfig(context), null, 2),
      startupGuidance: this.startupGuidance,
    }
  },
  toCanvasAgentDefinition() {
    return {
      id: this.id,
      label: this.label,
      description: this.description,
      launchCommand: this.launchCommand,
      transport: this.transport,
      mcpSupport: this.mcpSupport,
      configScope: this.configScope,
      status: this.status,
      configMode: this.configMode,
      startupMode: this.startupMode,
      guardNotes: this.guardNotes,
    }
  },
}

export const AGENT_NATIVE_RUNTIME_ADAPTERS: AgentNativeRuntimeAdapter[] = [
  codexRuntimeAdapter,
  claudeRuntimeAdapter,
]

export const AGENT_NATIVE_RUNTIME_DEFINITIONS: AgentNativeRuntimeDefinition[] =
  AGENT_NATIVE_RUNTIME_ADAPTERS.map((adapter) => ({
    id: adapter.id,
    label: adapter.label,
    description: adapter.description,
    launchCommand: adapter.launchCommand,
    transport: adapter.transport,
    mcpSupport: adapter.mcpSupport,
    configScope: adapter.configScope,
    status: adapter.status,
  }))

export function getAgentNativeRuntimeAdapter(runtimeId: string) {
  return AGENT_NATIVE_RUNTIME_ADAPTERS.find((adapter) => adapter.id === runtimeId) ?? null
}

export function listCanvasAgentDefinitions(): CanvasAgentDefinition[] {
  return AGENT_NATIVE_RUNTIME_ADAPTERS.map((adapter) => adapter.toCanvasAgentDefinition())
}

export function buildCanvasAgentSessionDraft(
  adapter: AgentNativeRuntimeAdapter,
  input: AgentNativeRuntimeSessionDraftInput
) {
  return {
    projectId: input.projectId,
    agentId: adapter.id,
    agentLabel: adapter.label,
    title:
      typeof input.title === "string" && input.title.trim()
        ? input.title.trim()
        : `${adapter.label} session`,
    cwd: input.cwd,
    launchProfile: normalizeCanvasAgentLaunchProfile(input.launchProfile),
    agentCommand: adapter.launchCommand,
    launchCommand: `cd ${JSON.stringify(input.cwd)} && ${adapter.launchCommand}`,
    toolCommand: input.toolCommand,
    mcpServerName: input.mcpServerName,
    mcpServerCommand: `${process.execPath} ${input.mcpServerEntry}`,
    mcpConfigPath: null,
    startupGuidance: adapter.startupGuidance,
    transport: "manual-cli" as const,
    status: "configured" as const,
    createdAt: input.now,
    updatedAt: input.now,
    cols: input.defaultTerminal.cols,
    rows: input.defaultTerminal.rows,
    pid: null,
    lastStartedAt: null,
    endedAt: null,
    exitCode: null,
    errorMessage: null,
  }
}

export function resolveAgentRuntimeSpawn(
  adapter: AgentNativeRuntimeAdapter,
  session: Pick<CanvasAgentSession, "cwd" | "agentCommand">,
  options: {
    shell: string
    platform: NodeJS.Platform
    cwdFallback: string
    windowsShell?: string
  }
) {
  const cwd = session?.cwd || options.cwdFallback
  const command = session?.agentCommand || adapter.launchCommand
  if (options.platform === "win32") {
    return {
      shell: options.windowsShell || "cmd.exe",
      args: ["/d", "/s", "/c", command],
      cwd,
    }
  }

  return {
    shell: options.shell,
    args: ["-lic", command],
    cwd,
  }
}
