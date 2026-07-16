/**
 * Typed surface for server/localScan.mjs (untyped .mjs per the
 * agentSearch.mjs precedent — behavior guarded by tests).
 */
export interface ProjectScanConfig {
  PROJECTS_ROOT?: string
  LOCAL_SCAN_ALLOWED_ROOTS?: string[]
  LOCAL_SCAN_MAX_FILES?: number
  LOCAL_SCAN_MAX_COMPONENTS?: number
  LOCAL_SCAN_IGNORE_DIRS?: Set<string>
  LOCAL_SCAN_SOURCE_EXTENSIONS?: Set<string>
  LOCAL_SCAN_AUTO_SYNC?: boolean
  LOCAL_SCAN_PROXY_SOURCE_PATH?: string
  slugify?: (value: string) => string
  toPascalCase?: (value: string) => string
  ensureProjectCanvasDir?: (projectsRoot: string, projectId: string) => Promise<unknown>
}

export interface ComponentExportCandidate {
  componentName: string
  exportName: string
}

export interface LocalScanSyncResult {
  ok: boolean
  projectId: string
  projectLabel: string
  repoPath: string
  detectedCount: number
  syncedCount: number
  entries: any[]
  message?: string
  localScan: any
  changed: boolean
}

export interface ProjectScan {
  uniqueName(baseName: string, componentDir: string, configDir: string): string
  ensureProjectScaffold(projectId: string, label?: string): Promise<void>
  readProjectMeta(projectDir: string, projectId: string): Promise<any>
  writeProjectMeta(projectDir: string, meta: any): Promise<void>
  normalizeSyncTargetState(syncTarget: any): any
  readProjectSyncTarget(projectDir: string, projectId: string): Promise<any>
  writeProjectSyncTarget(projectDir: string, projectId: string, syncTarget: any): Promise<any>
  revalidateSyncTargetRealpath(
    syncTarget: any
  ): Promise<{ ok: boolean; resolvedRealPath?: string }>
  writeTextFileIfChanged(filePath: string, content: string): Promise<boolean>
  normalizeLocalScanState(localScan: any): any
  listProjects(): Promise<Array<{ id: string; label: string; localScan: any }>>
  updateProjectRegistry(projectDir: string, entryId: string, kind?: string): Promise<void>
  updateProjectRegistryBulk(projectDir: string, entryIds: string[], kind?: string): Promise<void>
  syncProjectLocalScanRegistry(projectDir: string, entryIds: string[]): Promise<void>
  shouldHandleLocalScanPath(filePath: string): boolean
  getCommonPathPrefix(paths: string[]): string
  findLocalScanRootCandidate(startPath: string): string | null
  inferLocalScanProjectFromFiles(projectDir: string, projectId: string, label: string): Promise<any>
  listLocalScanProjects(): Promise<any[]>
  isSubPath(parentPath: string, candidatePath: string): boolean
  assertLocalScanPathAllowed(repoPath: string): void
  normalizeFsPathForUrl(filePath: string): string
  toFsModuleUrl(filePath: string): string
  inferLocalComponentNameFromFile(filePath: string): string
  extractReactComponentExports(source: string, filePath: string): ComponentExportCandidate[]
  collectLocalComponentCandidates(repoPath: string): Promise<string[]>
  buildLocalScanProxySource(): string
  formatLocalScanGalleryEntrySource(input: any): string
  syncLocalScanProject(input: {
    repoPath: string
    projectId: string
    projectLabel: string
  }): Promise<LocalScanSyncResult>
}

export function createProjectScan(config?: ProjectScanConfig): ProjectScan
