import { existsSync, readFileSync, promises as fs } from "node:fs"
import path from "node:path"

// FOX2-75 slice 9: the projects + local-scan subsystem, moved verbatim from
// vite.config.ts — project scaffold/meta/registry, sync-target persistence,
// local repo scanning (allowlist guard, component-export extraction,
// candidate collection), gallery-entry generation, and the scan/sync
// composite. Untyped .mjs per the agentSearch.mjs precedent;
// server/localScan.d.ts declares the typed surface. The vite alias plugin
// and file watchers stay in vite.config.ts and consume these exports.

export function createProjectScan(config = {}) {
  const {
    PROJECTS_ROOT,
    LOCAL_SCAN_ALLOWED_ROOTS,
    LOCAL_SCAN_MAX_FILES,
    LOCAL_SCAN_MAX_COMPONENTS,
    LOCAL_SCAN_IGNORE_DIRS,
    LOCAL_SCAN_SOURCE_EXTENSIONS,
    LOCAL_SCAN_AUTO_SYNC,
    LOCAL_SCAN_PROXY_SOURCE_PATH,
    slugify,
    toPascalCase,
    ensureProjectCanvasDir,
  } = config

  function uniqueName(baseName, componentDir, configDir) {
    const baseSlug = slugify(baseName)
    const baseComponent = toPascalCase(baseName)
    let slug = baseSlug
    let componentName = baseComponent
    let suffix = 1

    const hasConflict = () => {
      const componentPath = path.join(componentDir, `${componentName}.tsx`)
      const configPath = path.join(configDir, `${slug}.gallery.ts`)
      return existsSync(componentPath) || existsSync(configPath)
    }

    while (hasConflict()) {
      suffix += 1
      slug = `${baseSlug}-${suffix}`
      componentName = `${baseComponent}${suffix}`
    }

    return { slug, componentName }
  }

  async function ensureProjectScaffold(projectId, label) {
    const projectDir = path.join(PROJECTS_ROOT, projectId)
    await fs.mkdir(path.join(projectDir, 'components', 'paper'), { recursive: true })
    await fs.mkdir(path.join(projectDir, 'configs', 'paper'), { recursive: true })
    await ensureProjectCanvasDir(PROJECTS_ROOT, projectId)

    const metaPath = path.join(projectDir, 'project.json')
    if (!existsSync(metaPath)) {
      const meta = {
        label: label || projectId,
      }
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))
    }

    const registryPath = path.join(projectDir, 'registry.json')
    if (!existsSync(registryPath)) {
      await fs.writeFile(registryPath, JSON.stringify({ ui: [], page: [] }, null, 2))
    }

    return projectDir
  }

  async function readProjectMeta(projectDir, projectId) {
    const metaPath = path.join(projectDir, 'project.json')
    if (!existsSync(metaPath)) {
      return { label: projectId }
    }

    try {
      const raw = await fs.readFile(metaPath, 'utf8')
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : { label: projectId }
    } catch {
      return { label: projectId }
    }
  }

  async function writeProjectMeta(projectDir, meta) {
    const metaPath = path.join(projectDir, 'project.json')
    const nextRaw = JSON.stringify(meta, null, 2)
    if (existsSync(metaPath)) {
      try {
        const currentRaw = await fs.readFile(metaPath, 'utf8')
        if (currentRaw === nextRaw) return false
      } catch {
        // fall through and rewrite malformed metadata
      }
    }

    await fs.writeFile(metaPath, nextRaw)
    return true
  }

  // `meta.syncTarget` is a sibling key to `meta.localScan` on `project.json`.
  // It records the user-confirmed external Root B mapping so a re-sync reuses
  // it (and is the allowlist an agent's `target` must match). Shape:
  //   { rootPath, resolvedRealPath, componentsDir, format, mappedAt }
  // `resolvedRealPath` is the realpath at `mappedAt`; every re-sync re-runs
  // `fs.realpath(rootPath)` and compares — existence alone is insufficient (a
  // swapped symlink passes an existence check).
  function normalizeSyncTargetState(syncTarget) {
    if (!syncTarget || typeof syncTarget !== 'object') return null
    const rootPath =
      typeof syncTarget.rootPath === 'string' && syncTarget.rootPath.trim()
        ? path.resolve(syncTarget.rootPath.trim())
        : ''
    if (!rootPath) return null
    const resolvedRealPath =
      typeof syncTarget.resolvedRealPath === 'string' && syncTarget.resolvedRealPath.trim()
        ? syncTarget.resolvedRealPath.trim()
        : ''
    const componentsDir =
      typeof syncTarget.componentsDir === 'string' ? syncTarget.componentsDir.trim() : ''
    const format = syncTarget.format === 'html+tsx' ? 'html+tsx' : 'html'
    const mappedAt =
      typeof syncTarget.mappedAt === 'string' && syncTarget.mappedAt.trim()
        ? syncTarget.mappedAt
        : ''
    return { rootPath, resolvedRealPath, componentsDir, format, mappedAt }
  }

  async function readProjectSyncTarget(projectDir, projectId) {
    const meta = await readProjectMeta(projectDir, projectId)
    return normalizeSyncTargetState(meta?.syncTarget)
  }

  async function writeProjectSyncTarget(projectDir, projectId, syncTarget) {
    const meta = await readProjectMeta(projectDir, projectId)
    await writeProjectMeta(projectDir, {
      ...meta,
      syncTarget,
    })
    return normalizeSyncTargetState(syncTarget)
  }

  /**
   * Re-validate a persisted sync target on every re-sync. Existence AND realpath
   * match are BOTH required: a deleted/moved root fails the realpath call, and a
   * symlink swapped to point elsewhere passes an existence check but fails the
   * realpath comparison. Returns `{ ok: true, resolvedRealPath }` when the
   * mapping is still valid, else `{ ok: false }` (caller prompts re-pick; never
   * silently creates a tree).
   */
  async function revalidateSyncTargetRealpath(syncTarget) {
    if (!syncTarget || !syncTarget.rootPath) return { ok: false }
    let resolvedRealPath
    try {
      resolvedRealPath = await fs.realpath(syncTarget.rootPath)
    } catch {
      return { ok: false }
    }
    if (
      syncTarget.resolvedRealPath &&
      resolvedRealPath !== syncTarget.resolvedRealPath
    ) {
      return { ok: false }
    }
    return { ok: true, resolvedRealPath }
  }

  async function writeTextFileIfChanged(filePath, content) {
    if (existsSync(filePath)) {
      try {
        const current = await fs.readFile(filePath, 'utf8')
        if (current === content) return false
      } catch {
        // fall through and rewrite
      }
    }

    await fs.writeFile(filePath, content)
    return true
  }

  function normalizeLocalScanState(localScan) {
    if (!localScan || typeof localScan !== 'object') return null

    const repoPath =
      typeof localScan.repoPath === 'string' && localScan.repoPath.trim()
        ? path.resolve(localScan.repoPath.trim())
        : ''
    if (!repoPath) return null

    const detectedCount = Number(localScan.detectedCount)
    const createdEntries = Number(localScan.createdEntries)
    const scannedFiles = Number(localScan.scannedFiles)
    const enabled = localScan.enabled !== false

    return {
      enabled,
      watching: enabled && LOCAL_SCAN_AUTO_SYNC,
      repoPath,
      repoLabel:
        typeof localScan.repoLabel === 'string' && localScan.repoLabel.trim()
          ? localScan.repoLabel.trim()
          : path.basename(repoPath),
      scannedAt:
        typeof localScan.scannedAt === 'string' && localScan.scannedAt.trim()
          ? localScan.scannedAt
          : null,
      detectedCount: Number.isFinite(detectedCount) ? detectedCount : null,
      createdEntries: Number.isFinite(createdEntries) ? createdEntries : null,
      scannedFiles: Number.isFinite(scannedFiles) ? scannedFiles : null,
    }
  }

  async function listProjects() {
    if (!existsSync(PROJECTS_ROOT)) return []
    const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true })

    const projects = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const projectId = entry.name
          const meta = await readProjectMeta(path.join(PROJECTS_ROOT, projectId), projectId)
          const label =
            typeof meta?.label === 'string' && meta.label.trim()
              ? meta.label.trim()
              : projectId

          return {
            id: projectId,
            label,
            localScan: normalizeLocalScanState(meta?.localScan),
          }
        })
    )

    return projects.sort((a, b) => a.label.localeCompare(b.label))
  }

  async function updateProjectRegistry(projectDir, entryId, kind) {
    const registryPath = path.join(projectDir, 'registry.json')
    const fallback = { ui: [], page: [] }
    let registry = fallback

    if (existsSync(registryPath)) {
      try {
        const raw = await fs.readFile(registryPath, 'utf8')
        registry = JSON.parse(raw)
      } catch {
        registry = fallback
      }
    }

    const normalized = {
      ui: Array.isArray(registry.ui) ? registry.ui : [],
      page: Array.isArray(registry.page) ? registry.page : [],
    }

    const bucket = kind === 'page' ? 'page' : 'ui'
    const other = bucket === 'page' ? 'ui' : 'page'
    if (!normalized[bucket].includes(entryId)) {
      normalized[bucket].push(entryId)
    }
    normalized[other] = normalized[other].filter((id) => id !== entryId)

    await fs.writeFile(registryPath, JSON.stringify(normalized, null, 2))
  }

  async function updateProjectRegistryBulk(projectDir, entryIds, kind) {
    const normalizedIds = Array.from(
      new Set(
        (entryIds || [])
          .map((id) => (typeof id === 'string' ? id.trim() : ''))
          .filter(Boolean)
      )
    )
    if (normalizedIds.length === 0) return

    const registryPath = path.join(projectDir, 'registry.json')
    const fallback = { ui: [], page: [] }
    let registry = fallback

    if (existsSync(registryPath)) {
      try {
        const raw = await fs.readFile(registryPath, 'utf8')
        registry = JSON.parse(raw)
      } catch {
        registry = fallback
      }
    }

    const normalized = {
      ui: Array.isArray(registry.ui) ? registry.ui : [],
      page: Array.isArray(registry.page) ? registry.page : [],
    }

    const bucket = kind === 'page' ? 'page' : 'ui'
    const other = bucket === 'page' ? 'ui' : 'page'
    const bucketSet = new Set(normalized[bucket])
    normalizedIds.forEach((id) => bucketSet.add(id))
    normalized[bucket] = Array.from(bucketSet)
    normalized[other] = normalized[other].filter((id) => !normalizedIds.includes(id))

    await fs.writeFile(registryPath, JSON.stringify(normalized, null, 2))
  }

  async function syncProjectLocalScanRegistry(projectDir, entryIds) {
    const normalizedIds = Array.from(
      new Set(
        (entryIds || [])
          .map((id) => (typeof id === 'string' ? id.trim() : ''))
          .filter(Boolean)
      )
    )
    const registryPath = path.join(projectDir, 'registry.json')
    const fallback = { ui: [], page: [] }
    let registry = fallback

    if (existsSync(registryPath)) {
      try {
        const raw = await fs.readFile(registryPath, 'utf8')
        registry = JSON.parse(raw)
      } catch {
        registry = fallback
      }
    }

    const normalized = {
      ui: Array.isArray(registry.ui) ? registry.ui : [],
      page: Array.isArray(registry.page) ? registry.page : [],
    }

    const nextRegistry = {
      ui: [
        ...normalized.ui.filter((id) => typeof id === 'string' && !id.startsWith('local-scan/')),
        ...normalizedIds,
      ],
      page: normalized.page.filter((id) => typeof id === 'string' && !id.startsWith('local-scan/')),
    }

    const nextRaw = JSON.stringify(nextRegistry, null, 2)
    if (existsSync(registryPath)) {
      try {
        const currentRaw = await fs.readFile(registryPath, 'utf8')
        if (currentRaw === nextRaw) return false
      } catch {
        // fall through and rewrite malformed registry
      }
    }

    await fs.writeFile(registryPath, nextRaw)
    return true
  }

  function shouldHandleLocalScanPath(filePath) {
    const normalized = path.resolve(filePath)
    const segments = normalized.split(path.sep).filter(Boolean)
    if (segments.some((segment) => LOCAL_SCAN_IGNORE_DIRS.has(segment))) {
      return false
    }

    const ext = path.extname(normalized).toLowerCase()
    if (!ext) return true
    return LOCAL_SCAN_SOURCE_EXTENSIONS.has(ext)
  }

  function getCommonPathPrefix(paths) {
    if (!Array.isArray(paths) || paths.length === 0) return null
    const segmentLists = paths.map((value) => path.resolve(value).split(path.sep).filter(Boolean))
    const firstSegments = segmentLists[0]
    const shared = []

    for (let index = 0; index < firstSegments.length; index += 1) {
      const segment = firstSegments[index]
      if (segmentLists.every((segments) => segments[index] === segment)) {
        shared.push(segment)
        continue
      }
      break
    }

    if (shared.length === 0) {
      return path.parse(path.resolve(paths[0])).root
    }

    const root = path.parse(path.resolve(paths[0])).root
    return path.join(root, ...shared)
  }

  function findLocalScanRootCandidate(startPath) {
    const markers = [
      'package.json',
      'pnpm-workspace.yaml',
      'package-lock.json',
      'yarn.lock',
      'tsconfig.json',
      'vite.config.ts',
      'vite.config.js',
      'next.config.ts',
      'next.config.js',
    ]
    let current = path.resolve(startPath)

    for (let depth = 0; depth < 5; depth += 1) {
      if (markers.some((marker) => existsSync(path.join(current, marker)))) {
        return current
      }
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }

    return path.resolve(startPath)
  }

  async function inferLocalScanProjectFromFiles(projectDir, projectId, label) {
    const localConfigDir = path.join(projectDir, 'configs', 'local')
    if (!existsSync(localConfigDir)) return null

    const configFiles = (await fs.readdir(localConfigDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.startsWith('scan-') && entry.name.endsWith('.gallery.ts'))
      .map((entry) => path.join(localConfigDir, entry.name))

    if (configFiles.length === 0) return null

    const sourcePaths = []
    for (const filePath of configFiles.slice(0, 40)) {
      const raw = await fs.readFile(filePath, 'utf8').catch(() => '')
      if (!raw) continue
      const matches = raw.matchAll(/"sourcePath":\s*"([^"]+)"/g)
      for (const match of matches) {
        try {
          sourcePaths.push(JSON.parse(`"${match[1]}"`))
        } catch {
          sourcePaths.push(match[1])
        }
      }
    }

    if (sourcePaths.length === 0) return null
    const sharedPath = getCommonPathPrefix(sourcePaths.map((value) => path.dirname(value)))
    const repoPath = sharedPath ? findLocalScanRootCandidate(sharedPath) : null
    if (!repoPath) return null

    return {
      projectId,
      projectDir,
      label,
      repoPath,
      repoLabel: path.basename(repoPath),
    }
  }

  async function listLocalScanProjects() {
    if (!existsSync(PROJECTS_ROOT)) return []
    const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true })
    const projects = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const projectId = entry.name
      const projectDir = path.join(PROJECTS_ROOT, projectId)
      const meta = await readProjectMeta(projectDir, projectId)
      const localScan = meta?.localScan
      const label =
        typeof meta?.label === 'string' && meta.label.trim()
          ? meta.label.trim()
          : projectId

      if (localScan && typeof localScan === 'object') {
        const repoPathRaw =
          typeof localScan.repoPath === 'string' ? localScan.repoPath.trim() : ''
        if (repoPathRaw && localScan.enabled !== false) {
          const normalizedRepoPath = findLocalScanRootCandidate(path.resolve(repoPathRaw))
          const repoLabel =
            typeof localScan.repoLabel === 'string' && localScan.repoLabel.trim()
              ? localScan.repoLabel.trim()
              : path.basename(normalizedRepoPath)
          if (normalizedRepoPath !== path.resolve(repoPathRaw) || repoLabel !== localScan.repoLabel) {
            await writeProjectMeta(projectDir, {
              ...meta,
              label,
              localScan: {
                ...localScan,
                enabled: true,
                repoPath: normalizedRepoPath,
                repoLabel: path.basename(normalizedRepoPath),
              },
            })
          }
          projects.push({
            projectId,
            projectDir,
            label,
            repoPath: normalizedRepoPath,
            repoLabel: path.basename(normalizedRepoPath),
          })
          continue
        }
      }

      const inferredProject = await inferLocalScanProjectFromFiles(projectDir, projectId, label)
      if (inferredProject) {
        await writeProjectMeta(projectDir, {
          ...meta,
          label,
          localScan: {
            ...(meta?.localScan && typeof meta.localScan === 'object' ? meta.localScan : {}),
            enabled: true,
            repoPath: inferredProject.repoPath,
            repoLabel: inferredProject.repoLabel,
            inferredAt: new Date().toISOString(),
          },
        })
        projects.push(inferredProject)
      }
    }

    return projects
  }

  function isSubPath(parentPath, candidatePath) {
    const relative = path.relative(parentPath, candidatePath)
    if (!relative) return true
    return !relative.startsWith('..') && !path.isAbsolute(relative)
  }

  function assertLocalScanPathAllowed(repoPath) {
    const normalizedRepoPath = path.resolve(repoPath)
    const allowed = LOCAL_SCAN_ALLOWED_ROOTS.some((rootPath) => isSubPath(rootPath, normalizedRepoPath))
    if (!allowed) {
      const listed = LOCAL_SCAN_ALLOWED_ROOTS.join(', ')
      throw new Error(
        `Path is outside allowed scanner roots. Configure LOCAL_SCAN_ALLOWED_ROOTS. Allowed: ${listed}`
      )
    }
  }

  function normalizeFsPathForUrl(filePath) {
    const normalized = filePath.replace(/\\/g, '/')
    return normalized.startsWith('/') ? normalized : `/${normalized}`
  }

  function toFsModuleUrl(filePath) {
    return `/@fs${encodeURI(normalizeFsPathForUrl(filePath))}`
  }

  function inferLocalComponentNameFromFile(filePath) {
    const baseName = path.basename(filePath, path.extname(filePath))
    return toPascalCase(baseName || 'LocalComponent')
  }

  function extractReactComponentExports(source, filePath) {
    const results = []
    const seen = new Set()

    const pushExport = (componentName, exportName) => {
      const key = `${componentName}:${exportName}`
      if (seen.has(key)) return
      seen.add(key)
      results.push({
        componentName,
        exportName,
      })
    }

    const defaultFunctionMatches = source.matchAll(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/g)
    for (const match of defaultFunctionMatches) {
      pushExport(match[1], 'default')
    }

    const defaultClassMatches = source.matchAll(/export\s+default\s+class\s+([A-Z][A-Za-z0-9_]*)/g)
    for (const match of defaultClassMatches) {
      pushExport(match[1], 'default')
    }

    const defaultIdentifierMatches = source.matchAll(/export\s+default\s+([A-Z][A-Za-z0-9_]*)\b/g)
    for (const match of defaultIdentifierMatches) {
      pushExport(match[1], 'default')
    }

    const hasAnonymousDefault =
      /export\s+default\s+function\b(?!\s+[A-Z][A-Za-z0-9_]*)/.test(source) ||
      /export\s+default\s+class\b(?!\s+[A-Z][A-Za-z0-9_]*)/.test(source)
    if (hasAnonymousDefault) {
      pushExport(inferLocalComponentNameFromFile(filePath), 'default')
    }

    const namedMatches = source.matchAll(
      /export\s+(?:const|let|var|function|class)\s+([A-Z][A-Za-z0-9_]*)\b/g
    )
    for (const match of namedMatches) {
      pushExport(match[1], match[1])
    }

    return results
  }

  async function collectLocalComponentCandidates(repoPath) {
    const queue = [repoPath]
    const files = []

    while (queue.length > 0) {
      const current = queue.pop()
      if (!current) continue
      let entries = []
      try {
        entries = await fs.readdir(current, { withFileTypes: true })
      } catch (error) {
        const code = typeof error?.code === 'string' ? error.code : ''
        if (code === 'EPERM' || code === 'EACCES') {
          continue
        }
        throw error
      }
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name)
        if (entry.isDirectory()) {
          if (LOCAL_SCAN_IGNORE_DIRS.has(entry.name)) continue
          queue.push(fullPath)
          continue
        }
        if (!entry.isFile()) continue
        const ext = path.extname(entry.name).toLowerCase()
        if (!LOCAL_SCAN_SOURCE_EXTENSIONS.has(ext)) continue
        files.push(fullPath)
        if (files.length >= LOCAL_SCAN_MAX_FILES) {
          return files
        }
      }
    }

    return files
  }


  function buildLocalScanProxySource() {
    return readFileSync(LOCAL_SCAN_PROXY_SOURCE_PATH, 'utf8')
  }

  function formatLocalScanGalleryEntrySource({
    entryId,
    entryName,
    description,
    importPath,
    exportConstName,
    props,
  }) {
    return `import type { GalleryEntry } from "@/core"

  export const ${exportConstName}: GalleryEntry<Record<string, unknown>> = {
    id: ${JSON.stringify(entryId)},
    name: ${JSON.stringify(entryName)},
    category: "Local Scan",
    description: ${JSON.stringify(description)},
    importPath: ${JSON.stringify(importPath)},
    layoutSize: "large",
    variants: [
      {
        name: "Default",
        description: ${JSON.stringify(description)},
        status: "wip",
        category: "variant",
        props: ${JSON.stringify(props, null, 2)},
      },
    ],
  }
  `
  }

  async function syncLocalScanProject({ repoPath, projectId, projectLabel }) {
    const normalizedRepoPath = path.resolve(repoPath)
    assertLocalScanPathAllowed(normalizedRepoPath)

    let repoStat = null
    try {
      repoStat = await fs.stat(normalizedRepoPath)
    } catch {
      repoStat = null
    }
    if (!repoStat?.isDirectory()) {
      throw new Error('repoPath must point to an existing directory.')
    }

    const repoLabel = path.basename(normalizedRepoPath)
    const normalizedProjectId = slugify(projectId)
    const normalizedProjectLabel = projectLabel?.trim() || normalizedProjectId
    const projectDir = await ensureProjectScaffold(normalizedProjectId, normalizedProjectLabel)
    const localComponentDir = path.join(projectDir, 'components', 'local')
    const localConfigDir = path.join(projectDir, 'configs', 'local')
    await fs.mkdir(localComponentDir, { recursive: true })
    await fs.mkdir(localConfigDir, { recursive: true })

    let changed = false
    changed =
      (await writeTextFileIfChanged(
        path.join(localComponentDir, 'LocalScannedComponentProxy.tsx'),
        buildLocalScanProxySource()
      )) || changed

    const files = await collectLocalComponentCandidates(normalizedRepoPath)
    const candidates = []
    for (const filePath of files) {
      const source = await fs.readFile(filePath, 'utf8').catch(() => '')
      if (!source || !source.includes('export')) continue
      const exports = extractReactComponentExports(source, filePath)
      if (exports.length === 0) continue
      const relativePath = path.relative(normalizedRepoPath, filePath).replace(/\\/g, '/')
      exports.forEach((item) => {
        if (candidates.length >= LOCAL_SCAN_MAX_COMPONENTS) return
        candidates.push({
          componentName: item.componentName,
          exportName: item.exportName,
          filePath,
          relativePath,
        })
      })
      if (candidates.length >= LOCAL_SCAN_MAX_COMPONENTS) break
    }

    const preview = candidates.slice(0, 50).map((item) => ({
      componentName: item.componentName,
      exportName: item.exportName,
      relativePath: item.relativePath,
    }))

    const existingConfigFiles = existsSync(localConfigDir)
      ? (await fs.readdir(localConfigDir, { withFileTypes: true }))
          .filter((entry) => entry.isFile() && entry.name.endsWith('.gallery.ts'))
          .map((entry) => path.join(localConfigDir, entry.name))
      : []
    const nextConfigFiles = new Set()

    const proxyImportPath = `@project/${normalizedProjectId}/components/local/LocalScannedComponentProxy`
    const repoSlug = slugify(repoLabel)
    const createdEntryIds = []

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index]
      const relativeSlug = slugify(candidate.relativePath)
      const exportSlug = slugify(candidate.exportName || 'default')
      const entryId = `local-scan/${repoSlug}-${relativeSlug}-${exportSlug}`
      const entryName = `${candidate.componentName} (${repoLabel})`
      const description = `Scanned from ${candidate.relativePath}`
      const exportConstName = `${toPascalCase(
        `${candidate.componentName}-${repoSlug}-${index + 1}`
      )}Entry`
      const configSlug = `scan-${repoSlug}-${relativeSlug}-${exportSlug}`
      const configPath = path.join(localConfigDir, `${configSlug}.gallery.ts`)
      const entrySource = formatLocalScanGalleryEntrySource({
        entryId,
        entryName,
        description,
        importPath: proxyImportPath,
        exportConstName,
        props: {
          displayName: candidate.componentName,
          repoName: repoLabel,
          sourcePath: candidate.filePath,
          moduleUrl: toFsModuleUrl(candidate.filePath),
          exportName: candidate.exportName,
        },
      })

      nextConfigFiles.add(configPath)
      changed = (await writeTextFileIfChanged(configPath, entrySource)) || changed
      createdEntryIds.push(entryId)
    }

    for (const existingFile of existingConfigFiles) {
      if (nextConfigFiles.has(existingFile)) continue
      await fs.rm(existingFile, { force: true })
      changed = true
    }

    changed = (await syncProjectLocalScanRegistry(projectDir, createdEntryIds)) || changed

    const meta = await readProjectMeta(projectDir, normalizedProjectId)
    const nextLocalScan = {
      ...(meta?.localScan && typeof meta.localScan === 'object' ? meta.localScan : {}),
      enabled: true,
      repoPath: normalizedRepoPath,
      repoLabel,
      scannedAt: new Date().toISOString(),
      scannedFiles: files.length,
      detectedCount: candidates.length,
      createdEntries: createdEntryIds.length,
    }
    changed =
      (await writeProjectMeta(projectDir, {
        ...meta,
        label:
          typeof meta?.label === 'string' && meta.label.trim()
            ? meta.label.trim()
            : normalizedProjectLabel,
        localScan: nextLocalScan,
      })) || changed

    return {
      ok: true,
      projectId: normalizedProjectId,
      projectLabel:
        typeof meta?.label === 'string' && meta.label.trim()
          ? meta.label.trim()
          : normalizedProjectLabel,
      repoPath: normalizedRepoPath,
      scannedFiles: files.length,
      detectedCount: candidates.length,
      createdEntries: createdEntryIds.length,
      entries: preview,
      message:
        candidates.length === 0
          ? 'No React component exports were detected (.tsx/.jsx).'
          : undefined,
      localScan: normalizeLocalScanState(nextLocalScan),
      changed,
    }
  }
  return {
    uniqueName,
    ensureProjectScaffold,
    readProjectMeta,
    writeProjectMeta,
    normalizeSyncTargetState,
    readProjectSyncTarget,
    writeProjectSyncTarget,
    revalidateSyncTargetRealpath,
    writeTextFileIfChanged,
    normalizeLocalScanState,
    listProjects,
    updateProjectRegistry,
    updateProjectRegistryBulk,
    syncProjectLocalScanRegistry,
    shouldHandleLocalScanPath,
    getCommonPathPrefix,
    findLocalScanRootCandidate,
    inferLocalScanProjectFromFiles,
    listLocalScanProjects,
    isSubPath,
    assertLocalScanPathAllowed,
    normalizeFsPathForUrl,
    toFsModuleUrl,
    inferLocalComponentNameFromFile,
    extractReactComponentExports,
    collectLocalComponentCandidates,
    buildLocalScanProxySource,
    formatLocalScanGalleryEntrySource,
    syncLocalScanProject,
  }
}
