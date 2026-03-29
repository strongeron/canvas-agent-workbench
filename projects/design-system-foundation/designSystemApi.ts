import { precomputeValues } from "@capsizecss/core"
import * as interMetrics from "@capsizecss/metrics/inter"
import * as poppinsMetrics from "@capsizecss/metrics/poppins"

import type { DesignToken } from "../../demo-thicket/designTokens"

interface FontMetrics {
  familyName: string
  fullName: string
  postscriptName: string
  category: string
  capHeight: number
  ascent: number
  descent: number
  lineGap: number
  unitsPerEm: number
  xHeight: number
  xWidthAvg: number
  subsets?: unknown
}

const INTER_METRICS = interMetrics as unknown as FontMetrics
const POPPINS_METRICS = poppinsMetrics as unknown as FontMetrics

export type DesignSystemIconLibraryId = "lucide" | "canvas-symbols"

export interface DesignSystemScaleConfig {
  minViewportPx: number
  maxViewportPx: number
  baseUnitPx: number
  typeBaseMinPx: number
  typeBaseMaxPx: number
  minTypeScaleRatio: number
  maxTypeScaleRatio: number
  density: number
  fontFamilySans: string
  fontFamilyDisplay: string
  fontWeightSans: number
  fontWeightDisplay: number
  iconLibrary: DesignSystemIconLibraryId
  iconStroke: number
}

export interface TypographyScaleToken {
  id: string
  label: string
  step: number
  fontFamilyKey: "sans" | "display"
  fontFamilyVar: "--font-family-sans" | "--font-family-display"
  cssVar: string
  lineHeightVar: string
  minPx: number
  maxPx: number
  clamp: string
  lineHeightMinPx: number
  lineHeightMaxPx: number
  lineHeightClamp: string
  capHeightTrim: string
  baselineTrim: string
  sampleText: string
}

export interface IconScaleToken {
  id: string
  label: string
  cssVar: string
  pairedTypographyId: string
  minPx: number
  maxPx: number
  clamp: string
  opticalMinPx: number
  opticalMaxPx: number
}

export interface SpacingScaleToken {
  id: string
  label: string
  cssVar: string
  minPx: number
  maxPx: number
  clamp: string
}

export interface ControlSizeToken {
  id: string
  label: string
  cssVar: string
  fontSizeVar: string
  paddingVar: string
  minPx: number
  maxPx: number
  clamp: string
}

export interface LayoutRecipe {
  id: string
  label: string
  description: string
  direction: "column" | "row" | "grid"
  gapVar: string
  paddingVar: string
  columns?: number
}

export interface PrimitivePreviewDefinition {
  id: string
  label: string
  description: string
  previewKind:
    | "primitive-text"
    | "primitive-heading"
    | "primitive-button"
    | "primitive-surface"
  tokens: string[]
}

export interface RadixTokenMapping {
  radixVar: string
  sourceVar: string
}

export interface RadixThemeArtifact {
  mappings: RadixTokenMapping[]
  aliasVars: Record<string, string>
  cssText: string
  layersCssText: string
}

export interface DtcgDimensionToken {
  $value: string
  $type: "dimension" | "fontFamily" | "shadow"
  $description?: string
  $extensions?: {
    cssVar?: string
    aliasVar?: string
  }
}

export interface DtcgTokenDocument {
  $description: string
  font: {
    family: Record<string, DtcgDimensionToken>
    weight: Record<string, DtcgDimensionToken>
    size: Record<string, DtcgDimensionToken>
    lineHeight: Record<string, DtcgDimensionToken>
  }
  icon: {
    size: Record<string, DtcgDimensionToken>
    stroke: DtcgDimensionToken
  }
  space: Record<string, DtcgDimensionToken>
  control: {
    size: Record<string, DtcgDimensionToken>
  }
  radius: Record<string, DtcgDimensionToken>
  shadow: Record<string, DtcgDimensionToken>
}

export interface DesignSystemTokenBundle {
  config: DesignSystemScaleConfig
  typography: TypographyScaleToken[]
  icons: IconScaleToken[]
  spacing: SpacingScaleToken[]
  controls: ControlSizeToken[]
  radii: DesignToken[]
  shadows: DesignToken[]
  layouts: LayoutRecipe[]
  primitives: PrimitivePreviewDefinition[]
  tokens: DesignToken[]
  cssVars: Record<string, string>
  aliasVars: Record<string, string>
  dtcgDocument: DtcgTokenDocument
  dtcgJson: string
  radix: RadixThemeArtifact
}

export const DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG: DesignSystemScaleConfig = {
  minViewportPx: 320,
  maxViewportPx: 1440,
  baseUnitPx: 4,
  typeBaseMinPx: 16,
  typeBaseMaxPx: 18,
  minTypeScaleRatio: 1.2,
  maxTypeScaleRatio: 1.25,
  density: 1,
  fontFamilySans: "Inter",
  fontFamilyDisplay: "Poppins",
  fontWeightSans: 400,
  fontWeightDisplay: 650,
  iconLibrary: "lucide",
  iconStroke: 1.5,
}

const TYPOGRAPHY_STEPS = [
  {
    id: "xs",
    label: "Text XS",
    step: -2,
    family: "sans",
    sample: "Dense labels and helper copy that stays readable.",
  },
  {
    id: "sm",
    label: "Text SM",
    step: -1,
    family: "sans",
    sample: "Supportive UI copy with steady rhythm.",
  },
  {
    id: "base",
    label: "Text Base",
    step: 0,
    family: "sans",
    sample: "The default reading size for the system.",
  },
  {
    id: "lg",
    label: "Text LG",
    step: 1,
    family: "sans",
    sample: "Larger body copy for emphasis and scannability.",
  },
  {
    id: "xl",
    label: "Display XL",
    step: 2,
    family: "display",
    sample: "Fluid subhead copy with display metrics.",
  },
  {
    id: "2xl",
    label: "Display 2XL",
    step: 3,
    family: "display",
    sample: "Section headings that scale cleanly across viewports.",
  },
  {
    id: "3xl",
    label: "Display 3XL",
    step: 4,
    family: "display",
    sample: "Big, confident display sizing without breakpoints.",
  },
  {
    id: "4xl",
    label: "Display 4XL",
    step: 5,
    family: "display",
    sample: "Hero-scale typography driven by one scale engine.",
  },
] as const

const SPACING_STEPS = [
  { id: "50", label: "Space 50", multiplier: 0.5 },
  { id: "100", label: "Space 100", multiplier: 1 },
  { id: "150", label: "Space 150", multiplier: 1.5 },
  { id: "200", label: "Space 200", multiplier: 2 },
  { id: "300", label: "Space 300", multiplier: 3 },
  { id: "400", label: "Space 400", multiplier: 4 },
  { id: "500", label: "Space 500", multiplier: 6 },
  { id: "600", label: "Space 600", multiplier: 8 },
  { id: "700", label: "Space 700", multiplier: 12 },
  { id: "800", label: "Space 800", multiplier: 16 },
  { id: "900", label: "Space 900", multiplier: 20 },
] as const

const CONTROL_DEFINITIONS = [
  { id: "sm", label: "Control SM", typeId: "sm", paddingMultiplier: 1.5, paddingVar: "--space-200" },
  { id: "md", label: "Control MD", typeId: "base", paddingMultiplier: 2, paddingVar: "--space-300" },
  { id: "lg", label: "Control LG", typeId: "base", paddingMultiplier: 3, paddingVar: "--space-400" },
  { id: "xl", label: "Control XL", typeId: "lg", paddingMultiplier: 4, paddingVar: "--space-500" },
] as const

const ICON_DEFINITIONS = [
  { id: "sm", label: "Icon SM", pair: "sm" },
  { id: "md", label: "Icon MD", pair: "base" },
  { id: "lg", label: "Icon LG", pair: "xl" },
  { id: "xl", label: "Icon XL", pair: "3xl" },
] as const

const LAYOUT_RECIPES: LayoutRecipe[] = [
  {
    id: "stack-flow",
    label: "Stack Flow",
    description: "Column rhythm for cards, settings, and content sections.",
    direction: "column",
    gapVar: "--space-300",
    paddingVar: "--space-400",
  },
  {
    id: "cluster-actions",
    label: "Action Cluster",
    description: "Inline layout for actions, filters, and toolbars.",
    direction: "row",
    gapVar: "--space-200",
    paddingVar: "--space-300",
  },
  {
    id: "feature-grid",
    label: "Feature Grid",
    description: "Responsive card grid for previewing repeated modules.",
    direction: "grid",
    gapVar: "--space-400",
    paddingVar: "--space-500",
    columns: 3,
  },
  {
    id: "hero-split",
    label: "Hero Split",
    description: "Asymmetric split layout for paired content and media.",
    direction: "row",
    gapVar: "--space-600",
    paddingVar: "--space-600",
  },
]

const FOUNDATION_PRIMITIVES: PrimitivePreviewDefinition[] = [
  {
    id: "text",
    label: "Primitive Text",
    description: "Body copy wired to the fluid type scale and semantic foreground.",
    previewKind: "primitive-text",
    tokens: ["--font-family-sans", "--font-size-base", "--line-height-base", "--color-foreground"],
  },
  {
    id: "heading",
    label: "Primitive Heading",
    description: "Display typography built from the same scale and color roles.",
    previewKind: "primitive-heading",
    tokens: [
      "--font-family-display",
      "--font-size-3xl",
      "--line-height-3xl",
      "--color-foreground",
    ],
  },
  {
    id: "button",
    label: "Primitive Button",
    description: "Control sizing, radius, and color tokens resolved from the scale engine.",
    previewKind: "primitive-button",
    tokens: [
      "--size-control-md",
      "--space-300",
      "--radius",
      "--color-brand-600",
      "--color-inverse",
    ],
  },
  {
    id: "surface",
    label: "Primitive Surface",
    description: "Framed content block previewing space, radius, shadow, and surface color tokens.",
    previewKind: "primitive-surface",
    tokens: [
      "--space-500",
      "--radius-lg",
      "--shadow-card",
      "--color-surface",
      "--color-border-default",
      "--color-foreground",
    ],
  },
]

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundToGrid(value: number, grid: number) {
  return Math.max(grid, Math.round(value / grid) * grid)
}

function snapToEight(value: number, baseUnitPx: number) {
  return roundToGrid(value, baseUnitPx * 2)
}

function pxToRem(value: number) {
  return `${Number((value / 16).toFixed(4))}rem`
}

function formatClamp(
  minPx: number,
  maxPx: number,
  minViewportPx: number,
  maxViewportPx: number
) {
  if (minPx === maxPx || minViewportPx === maxViewportPx) {
    return pxToRem(minPx)
  }

  const slope = ((maxPx - minPx) / (maxViewportPx - minViewportPx)) * 100
  const interceptPx = minPx - ((maxPx - minPx) / (maxViewportPx - minViewportPx)) * minViewportPx

  return `clamp(${pxToRem(minPx)}, ${Number((interceptPx / 16).toFixed(4))}rem + ${Number(
    slope.toFixed(4)
  )}vw, ${pxToRem(maxPx)})`
}

export function resolveFluidValuePx(
  minPx: number,
  maxPx: number,
  minViewportPx: number,
  maxViewportPx: number,
  viewportPx: number
) {
  if (minPx === maxPx || minViewportPx === maxViewportPx) {
    return minPx
  }

  const clampedViewport = clampNumber(viewportPx, minViewportPx, maxViewportPx)
  const progress = (clampedViewport - minViewportPx) / (maxViewportPx - minViewportPx)
  return Number((minPx + (maxPx - minPx) * progress).toFixed(2))
}

function resolveFontMetrics(family: string): FontMetrics {
  const normalized = family.trim().toLowerCase()
  if (normalized.includes("poppins")) return POPPINS_METRICS
  return INTER_METRICS
}

function resolveLeadingRatio(step: number) {
  if (step <= -1) return 1.45
  if (step <= 1) return 1.4
  if (step <= 3) return 1.25
  return 1.15
}

function computeStepSize(basePx: number, ratio: number, step: number, baseUnitPx: number) {
  return roundToGrid(basePx * Math.pow(ratio, step), baseUnitPx)
}

function buildTypographyScale(config: DesignSystemScaleConfig): TypographyScaleToken[] {
  return TYPOGRAPHY_STEPS.map((definition) => {
    const minPx = computeStepSize(
      config.typeBaseMinPx,
      config.minTypeScaleRatio,
      definition.step,
      config.baseUnitPx
    )
    const maxPx = computeStepSize(
      config.typeBaseMaxPx,
      config.maxTypeScaleRatio,
      definition.step,
      config.baseUnitPx
    )
    const leadingRatio = resolveLeadingRatio(definition.step)
    const lineHeightMinPx = roundToGrid(minPx * leadingRatio, config.baseUnitPx)
    const lineHeightMaxPx = roundToGrid(maxPx * leadingRatio, config.baseUnitPx)
    const fontMetrics = resolveFontMetrics(
      definition.family === "display" ? config.fontFamilyDisplay : config.fontFamilySans
    )
    const trimValues = precomputeValues({
      fontSize: maxPx,
      leading: lineHeightMaxPx,
      fontMetrics,
    })

    return {
      id: definition.id,
      label: definition.label,
      step: definition.step,
      fontFamilyKey: definition.family,
      fontFamilyVar:
        definition.family === "display" ? "--font-family-display" : "--font-family-sans",
      cssVar: `--font-size-${definition.id}`,
      lineHeightVar: `--line-height-${definition.id}`,
      minPx,
      maxPx,
      clamp: formatClamp(minPx, maxPx, config.minViewportPx, config.maxViewportPx),
      lineHeightMinPx,
      lineHeightMaxPx,
      lineHeightClamp: formatClamp(
        lineHeightMinPx,
        lineHeightMaxPx,
        config.minViewportPx,
        config.maxViewportPx
      ),
      capHeightTrim: trimValues.capHeightTrim,
      baselineTrim: trimValues.baselineTrim,
      sampleText: definition.sample,
    }
  })
}

function buildIconScale(
  config: DesignSystemScaleConfig,
  typography: TypographyScaleToken[]
): IconScaleToken[] {
  const byId = typography.reduce<Record<string, TypographyScaleToken>>((acc, step) => {
    acc[step.id] = step
    return acc
  }, {})

  return ICON_DEFINITIONS.map((definition) => {
    const paired = byId[definition.pair]
    const minPx = roundToGrid(paired.lineHeightMinPx, config.baseUnitPx)
    const maxPx = roundToGrid(paired.lineHeightMaxPx, config.baseUnitPx)

    return {
      id: definition.id,
      label: definition.label,
      cssVar: `--icon-size-${definition.id}`,
      pairedTypographyId: paired.id,
      minPx,
      maxPx,
      clamp: formatClamp(minPx, maxPx, config.minViewportPx, config.maxViewportPx),
      opticalMinPx: Math.max(config.baseUnitPx * 3, minPx - config.baseUnitPx),
      opticalMaxPx: Math.max(config.baseUnitPx * 3, maxPx - config.baseUnitPx),
    }
  })
}

function buildSpacingScale(config: DesignSystemScaleConfig): SpacingScaleToken[] {
  const expansionFactor = config.typeBaseMaxPx / config.typeBaseMinPx

  return SPACING_STEPS.map((step) => {
    const minPx = roundToGrid(step.multiplier * config.baseUnitPx * config.density, config.baseUnitPx)
    const maxPx = roundToGrid(minPx * expansionFactor, config.baseUnitPx)
    return {
      id: step.id,
      label: step.label,
      cssVar: `--space-${step.id}`,
      minPx,
      maxPx,
      clamp: formatClamp(minPx, maxPx, config.minViewportPx, config.maxViewportPx),
    }
  })
}

function buildControlSizes(
  config: DesignSystemScaleConfig,
  typography: TypographyScaleToken[]
): ControlSizeToken[] {
  const byId = typography.reduce<Record<string, TypographyScaleToken>>((acc, step) => {
    acc[step.id] = step
    return acc
  }, {})

  return CONTROL_DEFINITIONS.map((definition) => {
    const pairedTypography = byId[definition.typeId]
    const paddingMinPx = roundToGrid(
      config.baseUnitPx * definition.paddingMultiplier * config.density,
      config.baseUnitPx
    )
    const paddingMaxPx = roundToGrid(
      paddingMinPx * (config.typeBaseMaxPx / config.typeBaseMinPx),
      config.baseUnitPx
    )
    const minPx = snapToEight(
      pairedTypography.lineHeightMinPx + paddingMinPx * 2,
      config.baseUnitPx
    )
    const maxPx = snapToEight(
      pairedTypography.lineHeightMaxPx + paddingMaxPx * 2,
      config.baseUnitPx
    )

    return {
      id: definition.id,
      label: definition.label,
      cssVar: `--size-control-${definition.id}`,
      fontSizeVar: pairedTypography.cssVar,
      paddingVar: definition.paddingVar,
      minPx,
      maxPx,
      clamp: formatClamp(minPx, maxPx, config.minViewportPx, config.maxViewportPx),
    }
  })
}

function buildRadiusTokens(config: DesignSystemScaleConfig): DesignToken[] {
  return [
    {
      name: "Radius SM",
      value: pxToRem(config.baseUnitPx),
      cssVar: "--radius-sm",
      category: "radius",
      description: `${config.baseUnitPx}px`,
    },
    {
      name: "Radius Default",
      value: pxToRem(config.baseUnitPx * 1.5),
      cssVar: "--radius",
      category: "radius",
      description: `${config.baseUnitPx * 1.5}px`,
    },
    {
      name: "Radius MD",
      value: pxToRem(config.baseUnitPx * 2),
      cssVar: "--radius-md",
      category: "radius",
      description: `${config.baseUnitPx * 2}px`,
    },
    {
      name: "Radius LG",
      value: pxToRem(config.baseUnitPx * 3),
      cssVar: "--radius-lg",
      category: "radius",
      description: `${config.baseUnitPx * 3}px`,
    },
    {
      name: "Radius XL",
      value: pxToRem(config.baseUnitPx * 4),
      cssVar: "--radius-xl",
      category: "radius",
      description: `${config.baseUnitPx * 4}px`,
    },
    {
      name: "Radius Full",
      value: "9999px",
      cssVar: "--radius-full",
      category: "radius",
      description: "Full pill/circle radius",
    },
  ]
}

function buildShadowTokens(): DesignToken[] {
  return [
    {
      name: "Shadow SM",
      value: "0 1px 2px oklch(0.25 0 0 / 0.08)",
      cssVar: "--shadow-sm",
      category: "shadow",
    },
    {
      name: "Shadow Default",
      value: "0 2px 4px oklch(0.25 0 0 / 0.08)",
      cssVar: "--shadow",
      category: "shadow",
    },
    {
      name: "Shadow Card",
      value: "0 8px 24px oklch(0.25 0 0 / 0.12)",
      cssVar: "--shadow-card",
      category: "shadow",
      description: "Default canvas preview elevation",
    },
  ]
}

function toAliasVar(cssVar: string) {
  return cssVar.replace(/^--/, "--ds-")
}

function createAliasVars(tokens: DesignToken[]) {
  return tokens.reduce<Record<string, string>>((acc, token) => {
    if (!token.cssVar) return acc
    acc[toAliasVar(token.cssVar)] = `var(${token.cssVar})`
    return acc
  }, {})
}

function createDtcgToken(
  value: string,
  type: "dimension" | "fontFamily" | "shadow",
  description?: string,
  cssVar?: string
): DtcgDimensionToken {
  return {
    $value: value,
    $type: type,
    $description: description,
    $extensions: cssVar
      ? {
          cssVar,
          aliasVar: toAliasVar(cssVar),
        }
      : undefined,
  }
}

function createDtcgTokenDocument(
  typography: TypographyScaleToken[],
  icons: IconScaleToken[],
  spacing: SpacingScaleToken[],
  controls: ControlSizeToken[],
  radii: DesignToken[],
  shadows: DesignToken[],
  tokens: DesignToken[],
  config: DesignSystemScaleConfig
): DtcgTokenDocument {
  const fontFamilySans = tokens.find((token) => token.cssVar === "--font-family-sans")
  const fontFamilyDisplay = tokens.find((token) => token.cssVar === "--font-family-display")
  const iconStroke = tokens.find((token) => token.cssVar === "--icon-stroke")

  return {
    $description:
      `Computed from base=${config.baseUnitPx}px, ratio=${config.minTypeScaleRatio}-${config.maxTypeScaleRatio}, density=${config.density}.`,
    font: {
      family: {
        sans: createDtcgToken(
          fontFamilySans?.value || `"${config.fontFamilySans}", system-ui, sans-serif`,
          "fontFamily",
          "Body font family",
          "--font-family-sans"
        ),
        display: createDtcgToken(
          fontFamilyDisplay?.value || `"${config.fontFamilyDisplay}", system-ui, sans-serif`,
          "fontFamily",
          "Display font family",
          "--font-family-display"
        ),
      },
      weight: {
        sans: createDtcgToken(
          `${config.fontWeightSans}`,
          "dimension",
          "Base body font weight",
          "--font-weight-sans"
        ),
        medium: createDtcgToken(
          `${clampNumber(config.fontWeightSans + 100, 500, 600)}`,
          "dimension",
          "Body font medium weight",
          "--font-weight-sans-medium"
        ),
        semibold: createDtcgToken(
          `${clampNumber(config.fontWeightSans + 200, 600, 700)}`,
          "dimension",
          "Body font semibold weight",
          "--font-weight-sans-semibold"
        ),
        bold: createDtcgToken(
          `${clampNumber(config.fontWeightSans + 300, 700, 800)}`,
          "dimension",
          "Body font bold weight",
          "--font-weight-sans-bold"
        ),
        display: createDtcgToken(
          `${config.fontWeightDisplay}`,
          "dimension",
          "Display font weight",
          "--font-weight-display"
        ),
      },
      size: typography.reduce<Record<string, DtcgDimensionToken>>((acc, step) => {
        acc[step.id] = createDtcgToken(
          step.clamp,
          "dimension",
          `${step.minPx}-${step.maxPx}px via Utopia`,
          step.cssVar
        )
        return acc
      }, {}),
      lineHeight: typography.reduce<Record<string, DtcgDimensionToken>>((acc, step) => {
        acc[step.id] = createDtcgToken(
          step.lineHeightClamp,
          "dimension",
          `${step.lineHeightMinPx}-${step.lineHeightMaxPx}px via Capsize`,
          step.lineHeightVar
        )
        return acc
      }, {}),
    },
    icon: {
      size: icons.reduce<Record<string, DtcgDimensionToken>>((acc, icon) => {
        acc[icon.id] = createDtcgToken(
          icon.clamp,
          "dimension",
          `${icon.minPx}-${icon.maxPx}px icon container`,
          icon.cssVar
        )
        return acc
      }, {}),
      stroke: createDtcgToken(
        iconStroke?.value || `${config.iconStroke}px`,
        "dimension",
        "Stroke width aligned to the body scale",
        "--icon-stroke"
      ),
    },
    space: spacing.reduce<Record<string, DtcgDimensionToken>>((acc, step) => {
      acc[step.id] = createDtcgToken(
        step.clamp,
        "dimension",
        `${step.minPx}-${step.maxPx}px`,
        step.cssVar
      )
      return acc
    }, {}),
    control: {
      size: controls.reduce<Record<string, DtcgDimensionToken>>((acc, control) => {
        acc[control.id] = createDtcgToken(
          control.clamp,
          "dimension",
          `${control.minPx}-${control.maxPx}px control height`,
          control.cssVar
        )
        return acc
      }, {}),
    },
    radius: radii.reduce<Record<string, DtcgDimensionToken>>((acc, token) => {
      if (!token.cssVar) return acc
      const key = token.cssVar.replace("--radius-", "").replace("--radius", "default")
      acc[key] = createDtcgToken(token.value, "dimension", token.description, token.cssVar)
      return acc
    }, {}),
    shadow: shadows.reduce<Record<string, DtcgDimensionToken>>((acc, token) => {
      if (!token.cssVar) return acc
      const key = token.cssVar.replace("--shadow-", "").replace("--shadow", "default")
      acc[key] = createDtcgToken(token.value, "shadow", token.description, token.cssVar)
      return acc
    }, {}),
  }
}

function createRadixThemeArtifact(tokens: DesignToken[]): RadixThemeArtifact {
  const getAlias = (cssVar: string) => toAliasVar(cssVar)
  const mappings: RadixTokenMapping[] = [
    { radixVar: "--default-font-family", sourceVar: getAlias("--font-family-sans") },
    { radixVar: "--heading-font-family", sourceVar: getAlias("--font-family-display") },
    { radixVar: "--font-size-1", sourceVar: getAlias("--font-size-xs") },
    { radixVar: "--font-size-2", sourceVar: getAlias("--font-size-sm") },
    { radixVar: "--font-size-3", sourceVar: getAlias("--font-size-base") },
    { radixVar: "--font-size-4", sourceVar: getAlias("--font-size-lg") },
    { radixVar: "--font-size-5", sourceVar: getAlias("--font-size-xl") },
    { radixVar: "--font-size-6", sourceVar: getAlias("--font-size-2xl") },
    { radixVar: "--font-size-7", sourceVar: getAlias("--font-size-3xl") },
    { radixVar: "--font-size-8", sourceVar: getAlias("--font-size-4xl") },
    { radixVar: "--font-size-9", sourceVar: getAlias("--font-size-4xl") },
    { radixVar: "--line-height-1", sourceVar: getAlias("--line-height-xs") },
    { radixVar: "--line-height-2", sourceVar: getAlias("--line-height-sm") },
    { radixVar: "--line-height-3", sourceVar: getAlias("--line-height-base") },
    { radixVar: "--line-height-4", sourceVar: getAlias("--line-height-lg") },
    { radixVar: "--line-height-5", sourceVar: getAlias("--line-height-xl") },
    { radixVar: "--line-height-6", sourceVar: getAlias("--line-height-2xl") },
    { radixVar: "--line-height-7", sourceVar: getAlias("--line-height-3xl") },
    { radixVar: "--line-height-8", sourceVar: getAlias("--line-height-4xl") },
    { radixVar: "--line-height-9", sourceVar: getAlias("--line-height-4xl") },
    { radixVar: "--space-1", sourceVar: getAlias("--space-100") },
    { radixVar: "--space-2", sourceVar: getAlias("--space-200") },
    { radixVar: "--space-3", sourceVar: getAlias("--space-300") },
    { radixVar: "--space-4", sourceVar: getAlias("--space-400") },
    { radixVar: "--space-5", sourceVar: getAlias("--space-500") },
    { radixVar: "--space-6", sourceVar: getAlias("--space-600") },
    { radixVar: "--space-7", sourceVar: getAlias("--space-700") },
    { radixVar: "--space-8", sourceVar: getAlias("--space-800") },
    { radixVar: "--space-9", sourceVar: getAlias("--space-900") },
    { radixVar: "--radius-1", sourceVar: getAlias("--radius-sm") },
    { radixVar: "--radius-2", sourceVar: getAlias("--radius-sm") },
    { radixVar: "--radius-3", sourceVar: getAlias("--radius-md") },
    { radixVar: "--radius-4", sourceVar: getAlias("--radius-lg") },
    { radixVar: "--radius-5", sourceVar: getAlias("--radius-xl") },
    { radixVar: "--radius-6", sourceVar: getAlias("--radius-full") },
    { radixVar: "--accent-9", sourceVar: "--color-brand-500" },
    { radixVar: "--accent-10", sourceVar: "--color-brand-600" },
    { radixVar: "--accent-11", sourceVar: "--color-brand-600" },
    { radixVar: "--accent-12", sourceVar: "--color-foreground" },
    { radixVar: "--accent-contrast", sourceVar: "--color-inverse" },
  ]

  const aliasVars = createAliasVars(tokens)
  const aliasCss = Object.entries(aliasVars)
    .map(([alias, value]) => `  ${alias}: ${value};`)
    .join("\n")
  const mappingCss = mappings
    .map(({ radixVar, sourceVar }) => `  ${radixVar}: var(${sourceVar});`)
    .join("\n")

  return {
    mappings,
    aliasVars,
    cssText: `.radix-themes {\n${aliasCss}\n${mappingCss}\n}`,
    layersCssText:
      '@layer tw_base, radix_ui, tw_components, custom;\n@import "@radix-ui/themes/styles.css" layer(radix_ui);\n@import "./tokens.css" layer(custom);\n@import "./adapters/radix/overrides.css" layer(custom);',
  }
}

export function createDesignSystemTokenBundle(
  config: DesignSystemScaleConfig = DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG
): DesignSystemTokenBundle {
  const normalizedConfig: DesignSystemScaleConfig = {
    ...config,
    minViewportPx: Math.min(config.minViewportPx, config.maxViewportPx),
    maxViewportPx: Math.max(config.minViewportPx, config.maxViewportPx),
    baseUnitPx: Math.max(2, config.baseUnitPx),
    typeBaseMinPx: clampNumber(config.typeBaseMinPx, 12, 20),
    typeBaseMaxPx: clampNumber(config.typeBaseMaxPx, 14, 24),
    minTypeScaleRatio: clampNumber(config.minTypeScaleRatio, 1.05, 1.4),
    maxTypeScaleRatio: clampNumber(config.maxTypeScaleRatio, 1.1, 1.6),
    density: clampNumber(config.density, 0.8, 1.25),
    fontWeightSans: clampNumber(
      config.fontWeightSans ?? DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG.fontWeightSans,
      350,
      550
    ),
    fontWeightDisplay: clampNumber(
      config.fontWeightDisplay ?? DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG.fontWeightDisplay,
      500,
      800
    ),
    iconLibrary: config.iconLibrary || DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG.iconLibrary,
    iconStroke: clampNumber(config.iconStroke, 1, 2.5),
  }

  const typography = buildTypographyScale(normalizedConfig)
  const icons = buildIconScale(normalizedConfig, typography)
  const spacing = buildSpacingScale(normalizedConfig)
  const controls = buildControlSizes(normalizedConfig, typography)
  const radii = buildRadiusTokens(normalizedConfig)
  const shadows = buildShadowTokens()

  const typographyTokens: DesignToken[] = [
    {
      name: "Font Sans",
      value: `"${normalizedConfig.fontFamilySans}", system-ui, -apple-system, sans-serif`,
      cssVar: "--font-family-sans",
      category: "typography",
      subcategory: "font-family",
      description: "Body font family used for the fluid scale.",
    },
    {
      name: "Font Display",
      value: `"${normalizedConfig.fontFamilyDisplay}", system-ui, -apple-system, sans-serif`,
      cssVar: "--font-family-display",
      category: "typography",
      subcategory: "font-family",
      description: "Display font family used for headings and hero copy.",
    },
    {
      name: "Font Weight Sans",
      value: `${normalizedConfig.fontWeightSans}`,
      cssVar: "--font-weight-sans",
      category: "typography",
      subcategory: "font-weight",
      description: "Base body font weight.",
    },
    {
      name: "Font Weight Sans Medium",
      value: `${clampNumber(normalizedConfig.fontWeightSans + 100, 500, 600)}`,
      cssVar: "--font-weight-sans-medium",
      category: "typography",
      subcategory: "font-weight",
      description: "Medium body font weight for controls and emphasized copy.",
    },
    {
      name: "Font Weight Sans Semibold",
      value: `${clampNumber(normalizedConfig.fontWeightSans + 200, 600, 700)}`,
      cssVar: "--font-weight-sans-semibold",
      category: "typography",
      subcategory: "font-weight",
      description: "Semibold body font weight.",
    },
    {
      name: "Font Weight Sans Bold",
      value: `${clampNumber(normalizedConfig.fontWeightSans + 300, 700, 800)}`,
      cssVar: "--font-weight-sans-bold",
      category: "typography",
      subcategory: "font-weight",
      description: "Bold body font weight.",
    },
    {
      name: "Font Weight Display",
      value: `${normalizedConfig.fontWeightDisplay}`,
      cssVar: "--font-weight-display",
      category: "typography",
      subcategory: "font-weight",
      description: "Display font weight used for headings.",
    },
    ...typography.flatMap((step) => [
      {
        name: step.label,
        value: step.clamp,
        cssVar: step.cssVar,
        category: "typography" as const,
        subcategory: "font-size",
        description: `${step.minPx}-${step.maxPx}px via Utopia clamp`,
      },
      {
        name: `Line Height ${step.id.toUpperCase()}`,
        value: step.lineHeightClamp,
        cssVar: step.lineHeightVar,
        category: "typography" as const,
        subcategory: "line-height",
        description: `${step.lineHeightMinPx}-${step.lineHeightMaxPx}px via Capsize metrics`,
      },
    ]),
    {
      name: "Icon Stroke",
      value: `${Number(normalizedConfig.iconStroke.toFixed(2))}px`,
      cssVar: "--icon-stroke",
      category: "typography",
      subcategory: "icon-stroke",
      description: "Stroke width aligned to the current type weight.",
    },
    ...icons.map((icon) => ({
      name: icon.label,
      value: icon.clamp,
      cssVar: icon.cssVar,
      category: "typography" as const,
      subcategory: "icon-size",
      description: `${icon.minPx}-${icon.maxPx}px container`,
    })),
  ]

  const spacingTokens: DesignToken[] = [
    ...spacing.map((step) => ({
      name: step.label,
      value: step.clamp,
      cssVar: step.cssVar,
      category: "spacing" as const,
      subcategory: "space",
      description: `${step.minPx}-${step.maxPx}px`,
    })),
    ...controls.map((control) => ({
      name: control.label,
      value: control.clamp,
      cssVar: control.cssVar,
      category: "spacing" as const,
      subcategory: "control-size",
      description: `${control.minPx}-${control.maxPx}px`,
    })),
  ]

  const tokens = [...typographyTokens, ...spacingTokens, ...radii, ...shadows]
  const cssVars = tokens.reduce<Record<string, string>>((acc, token) => {
    if (token.cssVar) acc[token.cssVar] = token.value
    return acc
  }, {})
  const aliasVars = createAliasVars(tokens)
  const dtcgDocument = createDtcgTokenDocument(
    typography,
    icons,
    spacing,
    controls,
    radii,
    shadows,
    tokens,
    normalizedConfig
  )
  const radix = createRadixThemeArtifact(tokens)

  return {
    config: normalizedConfig,
    typography,
    icons,
    spacing,
    controls,
    radii,
    shadows,
    layouts: LAYOUT_RECIPES,
    primitives: FOUNDATION_PRIMITIVES,
    tokens,
    cssVars,
    aliasVars,
    dtcgDocument,
    dtcgJson: JSON.stringify(dtcgDocument, null, 2),
    radix,
  }
}
