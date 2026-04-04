import path from "path"

import type { AgentNativeRuntimeDefinition } from "../types/agentNative"
import type { CanvasAgentDefinition, CanvasAgentSession } from "../types/canvas"

export const CANVAS_AGENT_RUNTIME_MCP_GUIDANCE =
  'This session is attached to a live canvas MCP server named "canvas". Prefer MCP resources and tools before Bash when the task touches the app surfaces. Start with workspace://manifest or get_workspace_manifest. For the freeform Canvas surface, use get_canvas_context or get_canvas_state, inspect primitives with list_primitives or get_primitive, create boards with create_artboard and create_primitive_item, then use update_item/select_items as needed. For Color Audit review tasks, use get_color_audit_state and get_color_audit_export_preview. For System Canvas review tasks, use get_system_canvas_state. Use export_board only for primitive-only artboards. Use shell and file edits only for repo code changes, tests, or debugging outside the scene graph.'

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
  session: Pick<CanvasAgentSession, "cwd" | "projectId">
  sessionDir: string
  toolCommand: string
  serverUrl: string
  mcpServerName: string
  mcpServerEntry: string
  mcpEnv: Record<string, string>
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

const codexRuntimeAdapter: AgentNativeRuntimeAdapter = {
  id: "codex",
  label: "Codex CLI",
  description: "OpenAI Codex CLI session in the current workspace.",
  launchCommand: "codex",
  transport: "pty",
  mcpSupport: "native",
  configScope: "global",
  status: "ready",
  configMode: "inline-overrides",
  startupMode: "inline-bootstrap",
  startupGuidance: CANVAS_AGENT_RUNTIME_MCP_GUIDANCE,
  guardNotes:
    "Uses inline MCP overrides and the runtime's native approval model. Restart the session when MCP wiring changes.",
  buildLaunchMetadata(context) {
    const codexOverrides = [
      `mcp_servers.${context.mcpServerName}.command=${JSON.stringify(process.execPath)}`,
      `mcp_servers.${context.mcpServerName}.args=${JSON.stringify([context.mcpServerEntry])}`,
      `mcp_servers.${context.mcpServerName}.env=${formatTomlInlineTable(context.mcpEnv)}`,
      `mcp_servers.${context.mcpServerName}.cwd=${JSON.stringify(context.session.cwd)}`,
    ]
    const overrideArgs = codexOverrides.map((override) => `-c ${shellQuote(override)}`).join(" ")
    const bootstrapPrompt = buildCodexBootstrapPrompt(this.startupGuidance)
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
    "Uses a project-scoped strict MCP config file and the runtime's local/project guard settings. Regenerate the config when session context changes.",
  buildLaunchMetadata(context) {
    const mcpConfigPath = path.join(context.sessionDir, "canvas-mcp.json")
    const agentCommand = `${this.launchCommand} --append-system-prompt ${shellQuote(this.startupGuidance)} --strict-mcp-config --mcp-config ${shellQuote(mcpConfigPath)}`
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
