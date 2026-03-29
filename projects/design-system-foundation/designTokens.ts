import type { DesignToken } from "../../demo-thicket/designTokens"
import {
  DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG,
  createDesignSystemTokenBundle,
} from "./designSystemApi"

const generatedSystem = createDesignSystemTokenBundle(DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG)

const colorTokens: DesignToken[] = [
  {
    name: "Surface",
    value: "rgb(252, 254, 253)",
    cssVar: "--color-surface",
    category: "color",
    subcategory: "surface",
    description: "Primary application surface",
  },
  {
    name: "Surface Dim",
    value: "rgb(247, 251, 249)",
    cssVar: "--color-surface-dim",
    category: "color",
    subcategory: "surface",
  },
  {
    name: "Foreground",
    value: "rgb(42, 42, 40)",
    cssVar: "--color-foreground",
    category: "color",
    subcategory: "text",
    description: "Primary text and icon color",
  },
  {
    name: "Muted Foreground",
    value: "rgb(89, 89, 85)",
    cssVar: "--color-muted-foreground",
    category: "color",
    subcategory: "text",
  },
  {
    name: "Border Default",
    value: "rgba(200, 200, 196, 0.6)",
    cssVar: "--color-border-default",
    category: "color",
    subcategory: "border",
  },
  {
    name: "Border Strong",
    value: "rgba(200, 200, 196, 0.8)",
    cssVar: "--color-border-strong",
    category: "color",
    subcategory: "border",
  },
  {
    name: "Brand 500",
    value: "rgb(43, 84, 62)",
    cssVar: "--color-brand-500",
    category: "color",
    subcategory: "brand",
    description: "Primary action color",
  },
  {
    name: "Brand 600",
    value: "rgb(37, 71, 53)",
    cssVar: "--color-brand-600",
    category: "color",
    subcategory: "brand",
  },
  {
    name: "Inverse",
    value: "rgb(255, 255, 255)",
    cssVar: "--color-inverse",
    category: "color",
    subcategory: "base",
  },
  {
    name: "Error",
    value: "rgb(206, 82, 62)",
    cssVar: "--color-error",
    category: "color",
    subcategory: "semantic",
  },
]

export const typographyTokens = generatedSystem.tokens.filter(
  (token) => token.category === "typography"
)

export const spacingTokens = generatedSystem.tokens.filter(
  (token) => token.category === "spacing"
)

export const radiusTokens = generatedSystem.radii

export const shadowTokens = generatedSystem.shadows

export const allTokens: DesignToken[] = [
  ...colorTokens,
  ...typographyTokens,
  ...spacingTokens,
  ...radiusTokens,
  ...shadowTokens,
]

export { DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG, createDesignSystemTokenBundle, generatedSystem }
