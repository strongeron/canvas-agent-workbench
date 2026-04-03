export type AgentNativeRuntimeId = "codex" | "claude" | "gemini" | (string & {})

export type AgentNativeWorkspaceId =
  | "canvas"
  | "color-audit"
  | "system-canvas"
  | "node-catalog"

export type AgentWorkspaceSyncMode = "live-bridge" | "manifest-only"
export type AgentWorkspaceMutationMode = "remote-operations" | "event-log" | "export-only" | "none"
export type AgentCapabilityStatus = "ready" | "partial" | "planned"

export interface AgentNativeResourceSummary {
  id: string
  uri: string
  title: string
  description: string
  status: AgentCapabilityStatus
}

export interface AgentNativeToolSummary {
  id: string
  title: string
  description: string
  status: AgentCapabilityStatus
  destructive?: boolean
}

export interface AgentNativePromptSummary {
  id: string
  title: string
  description: string
  status: AgentCapabilityStatus
}

export interface AgentNativeRuntimeDefinition {
  id: AgentNativeRuntimeId
  label: string
  description: string
  launchCommand: string
  transport: "cli" | "pty"
  mcpSupport: "native" | "planned"
  configScope: "global" | "project" | "user"
  status: AgentCapabilityStatus
}

export interface AgentWorkspaceDefinition {
  id: AgentNativeWorkspaceId
  label: string
  route: string
  description: string
  syncMode: AgentWorkspaceSyncMode
  mutationMode: AgentWorkspaceMutationMode
  entities: string[]
  capabilities: string[]
  resources: AgentNativeResourceSummary[]
  tools: AgentNativeToolSummary[]
  prompts: AgentNativePromptSummary[]
}

export interface AgentNativeManifest {
  version: number
  updatedAt: string
  runtimes: AgentNativeRuntimeDefinition[]
  workspaces: AgentWorkspaceDefinition[]
}

export interface WorkspaceManifestStateSummary {
  nodeCount?: number
  edgeCount?: number
  itemCount?: number
  groupCount?: number
  selection: string[]
  viewport?: {
    x: number
    y: number
    zoom: number
  }
}

export interface WorkspaceManifest {
  surface: AgentNativeWorkspaceId
  version: number
  capabilities: string[]
  entities: string[]
  resources: AgentNativeResourceSummary[]
  tools: AgentNativeToolSummary[]
  prompts: AgentNativePromptSummary[]
  currentState: WorkspaceManifestStateSummary
}

export interface AgentWorkspaceAdapter<
  TState = unknown,
  TOperation = unknown,
  TValidationResult = unknown,
> {
  id: AgentNativeWorkspaceId
  label: string
  getManifest(): WorkspaceManifest
  getState(): TState
  getNodeCatalog?(): unknown[]
  applyOperation?(operation: TOperation): unknown
  validateOperation?(operation: TOperation): TValidationResult
  getSystemPrompt?(): string
}

export interface AgentRuntimeAdapter<TSession = unknown, TEvent = unknown> {
  id: AgentNativeRuntimeId
  label: string
  startSession(config: {
    cwd: string
    workspaceId: AgentNativeWorkspaceId
    prompt?: string
  }): Promise<TSession>
  stopSession(sessionId: string): Promise<void>
  sendPrompt(sessionId: string, prompt: string): AsyncIterable<TEvent>
  getTranscript(sessionId: string): unknown[]
}

export type AgentWorkspaceEventKind =
  | "operation-queued"
  | "operation-applied"
  | "state-synced"

export interface AgentWorkspaceEvent<TOperation = unknown> {
  id: string
  workspaceId: AgentNativeWorkspaceId
  workspaceKey: string
  kind: AgentWorkspaceEventKind
  actor: "user" | "agent" | "system"
  source: string
  createdAt: string
  sourceClientId?: string | null
  cursor?: number | null
  operation?: TOperation
  stateSummary?: WorkspaceManifestStateSummary | null
  metadata?: Record<string, unknown> | null
}
