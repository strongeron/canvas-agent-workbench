import type { ComponentType } from "react"

import type { GalleryEntry, LayoutEntry, PagePatternEntry } from "../core"

import { Button } from "./components/ui/button"
import { Tooltip } from "./components/ui/tooltip"
import { galleryLayoutMeta } from "./registry/layoutMeta"

type AnyEntry = GalleryEntry | LayoutEntry | PagePatternEntry

type ModuleRecord = Record<string, any>

const galleryModules = import.meta.glob("./configs/**/*.gallery.ts", { eager: true })

const componentModules = import.meta.glob(
  ["./components/**/*.{ts,tsx}", "./platform/**/*.{ts,tsx}", "./layouts/**/*.{ts,tsx}", "./*.tsx"],
  { eager: true }
)

function toThicketPath(modulePath: string) {
  const normalized = modulePath.replace(/\\/g, "/")
  const marker = "/demo-thicket/"
  const markerIndex = normalized.lastIndexOf(marker)
  const relative = markerIndex >= 0
    ? normalized.slice(markerIndex + marker.length)
    : normalized.replace(/^\.?\//, "")

  if (!relative) return null

  return `@thicket/${relative.replace(/\.(tsx|ts)$/, "")}`
}

function buildModuleMap(modules: Record<string, unknown>) {
  const map = new Map<string, ModuleRecord>()

  for (const [path, mod] of Object.entries(modules)) {
    const thicketPath = toThicketPath(path)
    if (!thicketPath) continue
    map.set(thicketPath, mod as ModuleRecord)

    if (thicketPath.endsWith("/index")) {
      const withoutIndex = thicketPath.replace(/\/index$/, "")
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

function applyLayoutMeta(entries: GalleryEntry[]) {
  return entries.map((entry) => {
    const meta = galleryLayoutMeta[entry.id]
    if (!meta) return entry
    return {
      ...entry,
      layoutSize: meta.layoutSize ?? entry.layoutSize,
      allowOverflow: typeof meta.allowOverflow === "boolean"
        ? meta.allowOverflow
        : entry.allowOverflow,
    }
  })
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

const moduleMap = buildModuleMap(componentModules)

const rawEntries: AnyEntry[] = []
for (const mod of Object.values(galleryModules)) {
  for (const value of Object.values(mod as ModuleRecord)) {
    if (isGalleryEntry(value)) rawEntries.push(value)
  }
}

const componentEntries = rawEntries.filter(
  (entry): entry is GalleryEntry => entry.kind !== "layout" && entry.kind !== "page-pattern"
)
const layoutEntries = rawEntries.filter(
  (entry): entry is LayoutEntry => entry.kind === "layout"
)
const patternEntries = rawEntries.filter(
  (entry): entry is PagePatternEntry => entry.kind === "page-pattern"
)

const entries = applyLayoutMeta(componentEntries).sort((a, b) => {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category)
  }
  return a.name.localeCompare(b.name)
})

const componentMap: Record<string, ComponentType<any>> = {}

for (const entry of [...entries, ...layoutEntries, ...patternEntries]) {
  const { importPath, exportName } = parseSourceId(entry)
  const moduleRecord = moduleMap.get(importPath)
  const component = resolveComponentExport(moduleRecord, exportName, entry.name)
  if (!component) {
    console.warn(
      `[thicket scan] Missing component for ${entry.name} from ${importPath}#${exportName}`
    )
    continue
  }
  componentMap[entry.name] = component
}

export const thicketPack = {
  id: "thicket",
  label: "Thicket",
  entries,
  layouts: layoutEntries,
  patterns: patternEntries,
  componentMap,
  ui: {
    Button,
    Tooltip,
  },
}

export type ThicketPack = typeof thicketPack
