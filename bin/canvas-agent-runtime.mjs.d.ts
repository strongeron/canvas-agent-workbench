export interface CanvasAgentContext {
  sessionDir: string
  projectId?: string
  sessionId?: string
  serverUrl: string
  colorAuditWorkspaceKey: string
  systemCanvasWorkspaceKey: string
  nodeCatalogWorkspaceKey: string
}

export function buildDefaultColorAuditWorkspaceKey(projectId: string): string
export function buildDefaultSystemCanvasWorkspaceKey(projectId: string): string
export function buildDefaultNodeCatalogWorkspaceKey(projectId: string): string
export function getDefaultCanvasAgentServerUrl(): string
export function resolveCanvasAgentContextFilePath(cwd?: string): string
export function readCanvasAgentAttachedContext(filePath?: string): Promise<unknown>
export function writeCanvasAgentAttachedContext(payload: unknown, filePath?: string): Promise<string>
export function clearCanvasAgentAttachedContext(filePath?: string): Promise<void>
export function getCanvasAgentContextFromEnv(): CanvasAgentContext
export function bootstrapCanvasAgentSession(input: {
  projectId: string
  agentId?: string
  cwd?: string
  title?: string
  serverUrl?: string
  surfaceId?: string
  reuseSession?: boolean
}): Promise<unknown>
export function formatCanvasAgentShellExports(context: CanvasAgentContext): string
export function readAgentNativeManifest(context: CanvasAgentContext): Promise<unknown>
export function readAgentNativeWorkspaceManifest(
  context: CanvasAgentContext,
  workspaceId: string,
  workspaceKey?: string
): Promise<unknown>
export function readAgentNativeWorkspaceState(
  context: CanvasAgentContext,
  workspaceId: string,
  workspaceKey?: string
): Promise<unknown>
export function readAgentNativeWorkspaceEvents(
  context: CanvasAgentContext,
  workspaceId: string,
  workspaceKey?: string,
  options?: { cursor?: number; limit?: number }
): Promise<{ events: unknown[]; cursor: number }>
export function readColorAuditState(
  context: CanvasAgentContext,
  workspaceKey?: string
): Promise<unknown>
export function readColorAuditExportPreview(
  context: CanvasAgentContext,
  workspaceKey?: string
): Promise<unknown>
export function readSystemCanvasState(
  context: CanvasAgentContext,
  workspaceKey?: string
): Promise<unknown>
export function readNodeCatalogState(
  context: CanvasAgentContext,
  workspaceKey?: string
): Promise<unknown>
export function enqueueAgentNativeWorkspaceOperation(
  context: CanvasAgentContext,
  workspaceId: string,
  workspaceKey: string,
  operation: unknown,
  meta?: { source?: string; clientId?: string }
): Promise<unknown>
export function captureWorkspaceScreenshot(
  context: CanvasAgentContext,
  workspaceId: string,
  target?: "desktop" | "mobile"
): Promise<unknown>
