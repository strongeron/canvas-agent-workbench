/**
 * Gallery POC - Component Adapter Interface
 *
 * Abstracts how the gallery discovers and loads components.
 * Allows static (pre-defined map) or dynamic (lazy load) approaches.
 */

import type { ComponentType } from "react"
import type { AnyGalleryEntry, GalleryEntry, LayoutEntry, PagePatternEntry } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Adapter Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface GalleryAdapter {
  /**
   * Get a React component by its registered name
   */
  getComponent(name: string): ComponentType<any> | null

  /**
   * Check if a component is registered
   */
  hasComponent(name: string): boolean

  /**
   * Get all gallery entries (components, layouts, patterns)
   */
  getAllEntries(): AnyGalleryEntry[]

  /**
   * Get entries organized by category
   */
  getEntriesByCategory(): Record<string, GalleryEntry[]>

  /**
   * Get all layout entries
   */
  getLayouts(): LayoutEntry[]

  /**
   * Get all page pattern entries
   */
  getPagePatterns(): PagePatternEntry[]

  /**
   * Search entries by name, description, or category
   */
  searchEntries(query: string): AnyGalleryEntry[]

  /**
   * Get a single entry by its ID
   */
  getEntryById(id: string): AnyGalleryEntry | undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Static Adapter Implementation
// ─────────────────────────────────────────────────────────────────────────────

export interface StaticAdapterConfig {
  /**
   * Map of component names to React component types
   */
  componentMap: Record<string, ComponentType<any>>

  /**
   * All gallery entries
   */
  entries: GalleryEntry[]

  /**
   * Optional layout entries
   */
  layouts?: LayoutEntry[]

  /**
   * Optional page pattern entries
   */
  patterns?: PagePatternEntry[]
}

export function createStaticAdapter(config: StaticAdapterConfig): GalleryAdapter {
  const { componentMap, entries, layouts = [], patterns = [] } = config

  // Build category index
  const byCategory: Record<string, GalleryEntry[]> = {}
  for (const entry of entries) {
    const cat = entry.category
    if (!byCategory[cat]) {
      byCategory[cat] = []
    }
    byCategory[cat].push(entry)
  }

  // Build ID index
  const byId = new Map<string, AnyGalleryEntry>()
  for (const entry of entries) {
    byId.set(entry.id, entry)
  }
  for (const layout of layouts) {
    byId.set(layout.id, layout)
  }
  for (const pattern of patterns) {
    byId.set(pattern.id, pattern)
  }

  return {
    getComponent(name: string) {
      return componentMap[name] ?? null
    },

    hasComponent(name: string) {
      return name in componentMap
    },

    getAllEntries() {
      return [...entries, ...layouts, ...patterns]
    },

    getEntriesByCategory() {
      return byCategory
    },

    getLayouts() {
      return layouts
    },

    getPagePatterns() {
      return patterns
    },

    searchEntries(query: string) {
      const q = query.toLowerCase()
      return this.getAllEntries().filter((entry) => {
        return (
          entry.name.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.description?.toLowerCase().includes(q) ||
          entry.variants.some(
            (v) => v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
          )
        )
      })
    },

    getEntryById(id: string) {
      return byId.get(id)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Adapter (for lazy loading)
// ─────────────────────────────────────────────────────────────────────────────

export interface DynamicAdapterConfig {
  /**
   * Function to dynamically import a component by name
   */
  importComponent: (name: string) => Promise<ComponentType<any>>

  /**
   * Function to load gallery entries (could be from API, JSON, etc.)
   */
  loadEntries: () => Promise<GalleryEntry[]>

  /**
   * Optional: load layouts
   */
  loadLayouts?: () => Promise<LayoutEntry[]>

  /**
   * Optional: load patterns
   */
  loadPatterns?: () => Promise<PagePatternEntry[]>
}

export function createDynamicAdapter(config: DynamicAdapterConfig): GalleryAdapter & {
  initialize(): Promise<void>
  isInitialized(): boolean
} {
  const componentCache = new Map<string, ComponentType<any>>()
  let entries: GalleryEntry[] = []
  let layouts: LayoutEntry[] = []
  let patterns: PagePatternEntry[] = []
  let byCategory: Record<string, GalleryEntry[]> = {}
  let byId = new Map<string, AnyGalleryEntry>()
  let initialized = false

  async function initialize() {
    if (initialized) return

    entries = await config.loadEntries()
    layouts = config.loadLayouts ? await config.loadLayouts() : []
    patterns = config.loadPatterns ? await config.loadPatterns() : []

    // Build indexes
    byCategory = {}
    for (const entry of entries) {
      const cat = entry.category
      if (!byCategory[cat]) {
        byCategory[cat] = []
      }
      byCategory[cat].push(entry)
    }

    byId = new Map()
    for (const entry of entries) {
      byId.set(entry.id, entry)
    }
    for (const layout of layouts) {
      byId.set(layout.id, layout)
    }
    for (const pattern of patterns) {
      byId.set(pattern.id, pattern)
    }

    initialized = true
  }

  return {
    async initialize() {
      await initialize()
    },

    isInitialized() {
      return initialized
    },

    getComponent(name: string) {
      // Note: For dynamic adapter, use async version or preload
      return componentCache.get(name) ?? null
    },

    hasComponent(name: string) {
      return componentCache.has(name)
    },

    getAllEntries() {
      return [...entries, ...layouts, ...patterns]
    },

    getEntriesByCategory() {
      return byCategory
    },

    getLayouts() {
      return layouts
    },

    getPagePatterns() {
      return patterns
    },

    searchEntries(query: string) {
      const q = query.toLowerCase()
      return this.getAllEntries().filter((entry) => {
        return (
          entry.name.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.description?.toLowerCase().includes(q) ||
          entry.variants.some(
            (v) => v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
          )
        )
      })
    },

    getEntryById(id: string) {
      return byId.get(id)
    },
  }
}
