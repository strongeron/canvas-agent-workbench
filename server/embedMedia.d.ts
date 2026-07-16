/**
 * Typed surface for server/embedMedia.mjs (untyped .mjs per the
 * agentSearch.mjs precedent — behavior guarded by tests).
 */
export interface EmbedMediaConfig {
  EMBED_SNAPSHOT_TEMPLATE?: string
  EMBED_LIVE_TEMPLATE?: string
  EMBED_CAPTURE_TIMEOUT_MS?: number
  EMBED_CAPTURE_PRESETS?: Record<string, { width: number; height: number }>
  HYPERBEAM_API_KEY?: string
  HYPERBEAM_API_BASE?: string
  MEDIA_STORE_DIR?: string
  MEDIA_MAX_UPLOAD_BYTES?: number
  LOCAL_APP_DISCOVERY_TIMEOUT_MS?: number
  LOCAL_APPS_CACHE_MS?: number
  LOCAL_APP_FALLBACK_PORTS?: number[]
  buildAgentNativeWorkspaceScreenshotConfig?: (...args: any[]) => any
  cropAgentNativeWorkspaceScreenshotPng?: (...args: any[]) => any
  normalizeAgentNativeWorkspaceScreenshotCropRect?: (...args: any[]) => any
  resolveAgentNativeBrowserExecutable?: (...args: any[]) => any
  inferMediaKindFromMimeType?: (mimeType: string, fallbackUrl?: string) => string
  filenameFromRemoteUrl?: (remoteUrl: string, fallbackExt: string) => string
}

export interface StoredMediaResult {
  assetUrl?: string
  mediaUrl: string
  fileName: string
  mimeType: string
  sizeBytes: number
  storedAt: string
}

export interface EmbedMedia {
  normalizeOrigin(value: string): string | null
  parseFrameAncestorsDirective(cspHeader: string | null): string[] | null
  evaluateFramePolicy(input: {
    xFrameOptions: string | null
    frameAncestors: string[] | null
    targetOrigin: string
    appOrigin: string
  }): { embeddable: boolean; blockedBy: string | null; reason: string }
  fetchEmbedHeaders(url: string): Promise<any>
  buildEmbedSnapshotUrl(
    url: string,
    width: number,
    height: number,
    force?: boolean
  ): Promise<any>
  createEmbedLiveSession(url: string): Promise<{
    sessionUrl: string
    sessionId: string | null
    provider: string
    expiresAt: string | null
  } | null>
  deleteEmbedLiveSession(sessionId: string | null): Promise<void>
  parseDataUrlPayload(dataUrl: string): { buffer: Buffer; mimeType: string } | null
  mimeTypeForExtension(ext: string): string
  extensionForMime(mime: string): string
  storeMediaBuffer(buffer: Buffer, mimeType: string, filename?: string): Promise<StoredMediaResult>
  storeMediaDataUrl(dataUrl: string, filename?: string): Promise<StoredMediaResult>
  readStoredMedia(fileName: string): Promise<{ content: Buffer; mimeType: string } | null>
  parseProxyMediaUrl(raw: string): URL | null
  fetchProxyMedia(url: string, rangeHeader?: string | null): Promise<Response>
  importAssetFromRemoteUrl(
    assetUrl: string,
    preferredFilename?: string
  ): Promise<StoredMediaResult & { mediaKind: string }>
  normalizeCaptureProvider(raw: unknown): "playwright" | "fetch" | "auto"
  normalizeCaptureTargets(rawTargets: unknown): Array<"desktop" | "mobile">
  buildCaptureFilename(url: string, target: string, mimeType: string): string
  captureEmbedSnapshotTarget(
    url: string,
    target: string,
    provider: string,
    force?: boolean,
    options?: any
  ): Promise<any>
  captureAgentNativeWorkspaceScreenshot(input: any): Promise<any>
  discoverLocalApps(appOrigin: string, force?: boolean): Promise<any>
}

export function createEmbedMedia(config?: EmbedMediaConfig): EmbedMedia
