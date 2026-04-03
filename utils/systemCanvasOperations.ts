import type {
  DesignSystemIconLibraryId,
  DesignSystemScaleConfig,
} from "../projects/design-system-foundation/designSystemApi"

export const SYSTEM_CANVAS_VIEW_MODES = [
  "system",
  "colors",
  "type",
  "layout",
  "primitives",
  "standards",
  "all",
] as const

export type SystemCanvasViewMode = (typeof SYSTEM_CANVAS_VIEW_MODES)[number]

export type SystemCanvasOperation =
  | {
      type: "update-scale-config"
      patch: Partial<DesignSystemScaleConfig>
    }
  | {
      type: "set-view-mode"
      viewMode: SystemCanvasViewMode
    }
  | {
      type: "generate-scale-graph"
    }
  | {
      type: "apply-scale-vars"
    }

const DESIGN_SYSTEM_CONFIG_KEYS = new Set<keyof DesignSystemScaleConfig>([
  "minViewportPx",
  "maxViewportPx",
  "baseUnitPx",
  "typeBaseMinPx",
  "typeBaseMaxPx",
  "minTypeScaleRatio",
  "maxTypeScaleRatio",
  "density",
  "fontFamilySans",
  "fontFamilyDisplay",
  "fontWeightSans",
  "fontWeightDisplay",
  "iconLibrary",
  "iconStroke",
])

const DESIGN_SYSTEM_STRING_KEYS = new Set<keyof DesignSystemScaleConfig>([
  "fontFamilySans",
  "fontFamilyDisplay",
])

const DESIGN_SYSTEM_NUMBER_KEYS = new Set<keyof DesignSystemScaleConfig>([
  "minViewportPx",
  "maxViewportPx",
  "baseUnitPx",
  "typeBaseMinPx",
  "typeBaseMaxPx",
  "minTypeScaleRatio",
  "maxTypeScaleRatio",
  "density",
  "fontWeightSans",
  "fontWeightDisplay",
  "iconStroke",
])

const DESIGN_SYSTEM_ICON_LIBRARY_VALUES = new Set<DesignSystemIconLibraryId>([
  "lucide",
  "canvas-symbols",
])

export function isSystemCanvasViewMode(value: unknown): value is SystemCanvasViewMode {
  return typeof value === "string" && (SYSTEM_CANVAS_VIEW_MODES as readonly string[]).includes(value)
}

export function sanitizeSystemCanvasConfigPatch(
  patch: unknown
): Partial<DesignSystemScaleConfig> {
  if (!patch || typeof patch !== "object") return {}

  const nextPatch: Partial<DesignSystemScaleConfig> = {}

  for (const [rawKey, rawValue] of Object.entries(patch)) {
    const key = rawKey as keyof DesignSystemScaleConfig
    if (!DESIGN_SYSTEM_CONFIG_KEYS.has(key)) continue

    if (DESIGN_SYSTEM_STRING_KEYS.has(key)) {
      if (typeof rawValue === "string" && rawValue.trim()) {
        nextPatch[key] = rawValue.trim() as never
      }
      continue
    }

    if (key === "iconLibrary") {
      if (typeof rawValue === "string" && DESIGN_SYSTEM_ICON_LIBRARY_VALUES.has(rawValue as DesignSystemIconLibraryId)) {
        nextPatch[key] = rawValue as never
      }
      continue
    }

    if (DESIGN_SYSTEM_NUMBER_KEYS.has(key)) {
      const numericValue =
        typeof rawValue === "number"
          ? rawValue
          : typeof rawValue === "string" && rawValue.trim()
            ? Number.parseFloat(rawValue)
            : Number.NaN
      if (Number.isFinite(numericValue)) {
        nextPatch[key] = numericValue as never
      }
    }
  }

  return nextPatch
}
