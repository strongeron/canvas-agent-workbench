import type { DesignToken } from "../../demo-thicket/designTokens"

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

const typographyTokens: DesignToken[] = [
  {
    name: "Font Sans",
    value: "\"Inter\", system-ui, -apple-system, sans-serif",
    cssVar: "--font-family-sans",
    category: "typography",
    subcategory: "font-family",
  },
  {
    name: "Font Display",
    value: "\"Poppins\", system-ui, -apple-system, sans-serif",
    cssVar: "--font-family-display",
    category: "typography",
    subcategory: "font-family",
  },
  {
    name: "Text SM",
    value: "0.875rem",
    cssVar: "--font-size-sm",
    category: "typography",
    subcategory: "font-size",
  },
  {
    name: "Text Base",
    value: "1rem",
    cssVar: "--font-size-base",
    category: "typography",
    subcategory: "font-size",
  },
  {
    name: "Text XL",
    value: "1.25rem",
    cssVar: "--font-size-xl",
    category: "typography",
    subcategory: "font-size",
  },
  {
    name: "Text 3XL",
    value: "1.875rem",
    cssVar: "--font-size-3xl",
    category: "typography",
    subcategory: "font-size",
  },
]

const radiusTokens: DesignToken[] = [
  {
    name: "Radius",
    value: "0.375rem",
    cssVar: "--radius",
    category: "radius",
    description: "Default control radius",
  },
  {
    name: "Radius LG",
    value: "0.75rem",
    cssVar: "--radius-lg",
    category: "radius",
  },
]

const shadowTokens: DesignToken[] = [
  {
    name: "Shadow",
    value: "0 1px 3px rgba(22, 22, 20, 0.08), 0 1px 2px rgba(22, 22, 20, 0.06)",
    cssVar: "--shadow",
    category: "shadow",
  },
  {
    name: "Shadow Card",
    value: "0 2px 8px -1px rgba(22, 22, 20, 0.08), 0 1px 3px -1px rgba(22, 22, 20, 0.06)",
    cssVar: "--shadow-card",
    category: "shadow",
  },
]

export const allTokens: DesignToken[] = [
  ...colorTokens,
  ...typographyTokens,
  ...radiusTokens,
  ...shadowTokens,
]
