import type { ComponentType } from "react"

import type { GalleryEntry, LayoutEntry, PagePatternEntry } from "../core"

type AnyEntry = GalleryEntry | LayoutEntry | PagePatternEntry
type ModuleRecord = Record<string, any>

interface ProjectMeta {
  id: string
  label: string
  description?: string
}

export interface ProjectPack {
  id: string
  label: string
  entries: GalleryEntry[]
  layouts: LayoutEntry[]
  patterns: PagePatternEntry[]
  componentMap: Record<string, ComponentType<any>>
}

const projectMetaModules = import.meta.glob("./*/project.json", {
  eager: true,
  import: "default",
})

const projectConfigModules = import.meta.glob("./*/configs/**/*.gallery.ts", {
  eager: true,
})

const projectComponentModules = import.meta.glob("./*/components/**/*.{ts,tsx}", {
  eager: true,
})

function normalizePath(value: string) {
  return value.replace(/\\/g, "/")
}

function getProjectIdFromPath(modulePath: string): string | null {
  const normalized = normalizePath(modulePath).replace(/^\.\/?/, "")
  const projectId = normalized.split("/")[0]
  return projectId || null
}

function toProjectImportPath(modulePath: string): string | null {
  const normalized = normalizePath(modulePath).replace(/^\.\/?/, "")
  const parts = normalized.split("/")
  const projectId = parts.shift()
  if (!projectId) return null
  const withoutExt = parts.join("/").replace(/\.(tsx|ts)$/, "")
  return `@project/${projectId}/${withoutExt}`
}

function normalizeProjectImportPath(importPath: string, projectId: string) {
  if (!importPath) return importPath
  const trimmed = importPath.replace(/\.(tsx|ts)$/, "")
  if (trimmed.startsWith("@project/")) {
    return trimmed
  }
  const withoutRelative = trimmed.replace(/^(\.\/|(\.\.\/)+)/, "")
  return `@project/${projectId}/${withoutRelative}`
}

function buildModuleMap(modules: Record<string, unknown>) {
  const map = new Map<string, ModuleRecord>()

  for (const [path, mod] of Object.entries(modules)) {
    const importPath = toProjectImportPath(path)
    if (!importPath) continue
    map.set(importPath, mod as ModuleRecord)

    if (importPath.endsWith("/index")) {
      const withoutIndex = importPath.replace(/\/index$/, "")
      if (!map.has(withoutIndex)) {
        map.set(withoutIndex, mod as ModuleRecord)
      }
    }
  }

  return map
}

function isGalleryEntry(value: unknown): value is AnyEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as AnyEntry
  return typeof entry.importPath === "string" && Array.isArray(entry.variants)
}

function parseSourceId(entry: AnyEntry) {
  const sourceId = entry.meta && "sourceId" in entry.meta ? entry.meta.sourceId : null
  if (!sourceId || typeof sourceId !== "string") {
    return { importPath: entry.importPath, exportName: entry.name }
  }
  const [importPath, exportName] = sourceId.split("#")
  return {
    importPath: importPath || entry.importPath,
    exportName: exportName || entry.name,
  }
}

function resolveComponentExport(
  moduleRecord: ModuleRecord | undefined,
  exportName: string,
  entryName: string
): ComponentType<any> | null {
  if (!moduleRecord) return null
  if (exportName && moduleRecord[exportName]) return moduleRecord[exportName]
  if (entryName && moduleRecord[entryName]) return moduleRecord[entryName]
  if (moduleRecord.default) return moduleRecord.default
  const firstExport = Object.values(moduleRecord).find((value) => typeof value === "function")
  return (firstExport as ComponentType<any>) ?? null
}

const moduleMap = buildModuleMap(projectComponentModules)

function getProjectMeta(): Record<string, ProjectMeta> {
  const meta: Record<string, ProjectMeta> = {}
  for (const [path, value] of Object.entries(projectMetaModules)) {
    const projectId = getProjectIdFromPath(path)
    if (!projectId) continue
    const record = value as Partial<ProjectMeta>
    meta[projectId] = {
      id: projectId,
      label: record.label || projectId,
      description: record.description,
    }
  }
  return meta
}

function buildProjectPacks() {
  const byProject: Record<string, AnyEntry[]> = {}

  for (const [path, mod] of Object.entries(projectConfigModules)) {
    const projectId = getProjectIdFromPath(path)
    if (!projectId) continue
    for (const value of Object.values(mod as ModuleRecord)) {
      if (isGalleryEntry(value)) {
        if (!byProject[projectId]) byProject[projectId] = []
        byProject[projectId].push(value)
      }
    }
  }

  const meta = getProjectMeta()
  const packs: ProjectPack[] = []
  const projectIds = new Set<string>([...Object.keys(meta), ...Object.keys(byProject)])

  for (const projectId of projectIds) {
    const entries = byProject[projectId] ?? []
    const componentEntries = entries.filter(
      (entry): entry is GalleryEntry => entry.kind !== "layout" && entry.kind !== "page-pattern"
    )
    const layoutEntries = entries.filter(
      (entry): entry is LayoutEntry => entry.kind === "layout"
    )
    const patternEntries = entries.filter(
      (entry): entry is PagePatternEntry => entry.kind === "page-pattern"
    )

    const componentMap: Record<string, ComponentType<any>> = {}

    for (const entry of [...componentEntries, ...layoutEntries, ...patternEntries]) {
      const { importPath, exportName } = parseSourceId(entry)
      const normalizedImportPath = normalizeProjectImportPath(importPath, projectId)
      const moduleRecord =
        moduleMap.get(normalizedImportPath) ?? moduleMap.get(importPath)
      const component = resolveComponentExport(moduleRecord, exportName, entry.name)
      if (!component) {
        console.warn(
          `[project pack] Missing component for ${entry.name} from ${importPath}#${exportName}`
        )
        continue
      }
      componentMap[entry.name] = component
    }

    packs.push({
      id: projectId,
      label: meta[projectId]?.label || projectId,
      entries: componentEntries,
      layouts: layoutEntries,
      patterns: patternEntries,
      componentMap,
    })
  }

  return packs.sort((a, b) => a.label.localeCompare(b.label))
}

export const projectPacks = buildProjectPacks()

export function getProjectPack(projectId: string): ProjectPack | undefined {
  return projectPacks.find((pack) => pack.id === projectId)
}
