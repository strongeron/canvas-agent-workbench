export type TokenCategory = 'color' | 'typography' | 'spacing' | 'shadow' | 'radius' | 'duration'

export interface DesignToken {
  name: string
  value: string
  cssVar?: string
  category: TokenCategory
  subcategory?: string
  description?: string
}

export const colorTokens: DesignToken[] = [
  { name: 'Brand 50', value: 'rgb(237, 245, 241)', cssVar: '--color-brand-50', category: 'color', subcategory: 'brand' },
  { name: 'Brand 100', value: 'rgb(219, 235, 227)', cssVar: '--color-brand-100', category: 'color', subcategory: 'brand' },
  { name: 'Brand 200', value: 'rgb(182, 214, 199)', cssVar: '--color-brand-200', category: 'color', subcategory: 'brand' },
  { name: 'Brand 300', value: 'rgb(146, 194, 170)', cssVar: '--color-brand-300', category: 'color', subcategory: 'brand' },
  { name: 'Brand 400', value: 'rgb(94, 139, 116)', cssVar: '--color-brand-400', category: 'color', subcategory: 'brand' },
  { name: 'Brand 500', value: 'rgb(43, 84, 62)', cssVar: '--color-brand-500', category: 'color', subcategory: 'brand', description: 'Primary brand color' },
  { name: 'Brand 600', value: 'rgb(37, 71, 53)', cssVar: '--color-brand-600', category: 'color', subcategory: 'brand', description: 'Primary button background' },
  { name: 'Brand 700', value: 'rgb(30, 59, 44)', cssVar: '--color-brand-700', category: 'color', subcategory: 'brand' },
  { name: 'Brand 800', value: 'rgb(24, 47, 35)', cssVar: '--color-brand-800', category: 'color', subcategory: 'brand' },
  { name: 'Brand 900', value: 'rgb(17, 35, 26)', cssVar: '--color-brand-900', category: 'color', subcategory: 'brand' },
  { name: 'Brand 950', value: 'rgb(13, 26, 19)', cssVar: '--color-brand-950', category: 'color', subcategory: 'brand' },

  { name: 'Surface 50', value: 'rgb(252, 254, 253)', cssVar: '--color-surface-50', category: 'color', subcategory: 'surface', description: 'Main surface background' },
  { name: 'Surface 100', value: 'rgb(247, 251, 249)', cssVar: '--color-surface-100', category: 'color', subcategory: 'surface' },
  { name: 'Surface 200', value: 'rgb(238, 246, 242)', cssVar: '--color-surface-200', category: 'color', subcategory: 'surface' },
  { name: 'Surface 300', value: 'rgb(229, 241, 235)', cssVar: '--color-surface-300', category: 'color', subcategory: 'surface' },

  { name: 'Neutral 50', value: 'rgb(248, 248, 247)', cssVar: '--color-neutral-50', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 100', value: 'rgb(241, 241, 239)', cssVar: '--color-neutral-100', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 200', value: 'rgb(226, 226, 223)', cssVar: '--color-neutral-200', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 300', value: 'rgb(200, 200, 196)', cssVar: '--color-neutral-300', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 400', value: 'rgb(152, 152, 148)', cssVar: '--color-neutral-400', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 500', value: 'rgb(105, 105, 100)', cssVar: '--color-neutral-500', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 600', value: 'rgb(89, 89, 85)', cssVar: '--color-neutral-600', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 700', value: 'rgb(74, 74, 70)', cssVar: '--color-neutral-700', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 800', value: 'rgb(58, 58, 55)', cssVar: '--color-neutral-800', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 900', value: 'rgb(42, 42, 40)', cssVar: '--color-neutral-900', category: 'color', subcategory: 'neutral' },
  { name: 'Neutral 950', value: 'rgb(32, 32, 30)', cssVar: '--color-neutral-950', category: 'color', subcategory: 'neutral' },

  { name: 'Text Primary', value: 'rgb(42, 42, 40)', cssVar: '--color-foreground', category: 'color', subcategory: 'text', description: 'Main text color (foreground)' },
  { name: 'Text Secondary', value: 'rgb(89, 89, 85)', cssVar: '--color-muted-foreground', category: 'color', subcategory: 'text', description: 'Secondary text color (muted foreground)' },
  { name: 'Text Tertiary', value: 'rgb(152, 152, 148)', cssVar: '--color-muted', category: 'color', subcategory: 'text', description: 'Muted text color' },
  { name: 'Text Disabled', value: 'rgb(152, 152, 148)', cssVar: '--color-disabled', category: 'color', subcategory: 'text', description: 'Disabled text color' },

  { name: 'Error', value: 'rgb(206, 82, 62)', cssVar: '--color-error', category: 'color', subcategory: 'semantic', description: 'Error state color' },
  { name: 'Error Surface', value: 'rgb(253, 238, 236)', cssVar: '--color-error-surface', category: 'color', subcategory: 'semantic' },
  { name: 'Error Text', value: 'rgb(154, 52, 37)', cssVar: '--color-error-text', category: 'color', subcategory: 'semantic' },
  { name: 'Error Border', value: 'rgb(185, 74, 56)', cssVar: '--color-error-border', category: 'color', subcategory: 'semantic' },

  { name: 'Success', value: 'rgb(34, 145, 96)', cssVar: '--color-success', category: 'color', subcategory: 'semantic', description: 'Success state color' },
  { name: 'Success Surface', value: 'rgb(234, 247, 241)', cssVar: '--color-success-surface', category: 'color', subcategory: 'semantic' },
  { name: 'Success Text', value: 'rgb(21, 94, 62)', cssVar: '--color-success-text', category: 'color', subcategory: 'semantic' },
  { name: 'Success Border', value: 'rgb(30, 130, 86)', cssVar: '--color-success-border', category: 'color', subcategory: 'semantic' },

  { name: 'Warning', value: 'rgb(212, 161, 68)', cssVar: '--color-warning', category: 'color', subcategory: 'semantic', description: 'Warning state color' },
  { name: 'Warning Surface', value: 'rgb(252, 246, 235)', cssVar: '--color-warning-surface', category: 'color', subcategory: 'semantic' },
  { name: 'Warning Text', value: 'rgb(159, 117, 44)', cssVar: '--color-warning-text', category: 'color', subcategory: 'semantic' },
  { name: 'Warning Border', value: 'rgb(191, 145, 61)', cssVar: '--color-warning-border', category: 'color', subcategory: 'semantic' },

  { name: 'Border Subtle', value: 'rgba(200, 200, 196, 0.4)', cssVar: '--color-border-subtle', category: 'color', subcategory: 'border' },
  { name: 'Border Default', value: 'rgba(200, 200, 196, 0.6)', cssVar: '--color-border-default', category: 'color', subcategory: 'border' },
  { name: 'Border Strong', value: 'rgba(200, 200, 196, 0.8)', cssVar: '--color-border-strong', category: 'color', subcategory: 'border' },

  { name: 'White', value: 'rgb(255, 255, 255)', cssVar: '--color-white', category: 'color', subcategory: 'base' },
  { name: 'Black', value: 'rgb(0, 0, 0)', cssVar: '--color-black', category: 'color', subcategory: 'base' },
  { name: 'Inverse', value: 'rgb(255, 255, 255)', cssVar: '--color-inverse', category: 'color', subcategory: 'base', description: 'Inverse text color (white)' },
  { name: 'Backdrop', value: 'rgba(22, 22, 20, 0.6)', cssVar: '--color-backdrop', category: 'color', subcategory: 'base', description: 'Modal backdrop overlay' },
]

export const typographyTokens: DesignToken[] = [
  { name: 'Font Sans', value: '"Inter", system-ui, -apple-system, sans-serif', cssVar: '--font-family-sans', category: 'typography', subcategory: 'font-family', description: 'Main body font' },
  { name: 'Font Display', value: '"Poppins", system-ui, -apple-system, sans-serif', cssVar: '--font-family-display', category: 'typography', subcategory: 'font-family', description: 'Headings and display text' },

  { name: 'Text XS', value: '0.75rem', cssVar: '--font-size-xs', category: 'typography', subcategory: 'font-size', description: '12px' },
  { name: 'Text SM', value: '0.875rem', cssVar: '--font-size-sm', category: 'typography', subcategory: 'font-size', description: '14px' },
  { name: 'Text Base', value: '1rem', cssVar: '--font-size-base', category: 'typography', subcategory: 'font-size', description: '16px' },
  { name: 'Text LG', value: '1.125rem', cssVar: '--font-size-lg', category: 'typography', subcategory: 'font-size', description: '18px' },
  { name: 'Text XL', value: '1.25rem', cssVar: '--font-size-xl', category: 'typography', subcategory: 'font-size', description: '20px' },
  { name: 'Text 2XL', value: '1.5rem', cssVar: '--font-size-2xl', category: 'typography', subcategory: 'font-size', description: '24px' },
  { name: 'Text 3XL', value: '1.875rem', cssVar: '--font-size-3xl', category: 'typography', subcategory: 'font-size', description: '30px' },
  { name: 'Text 4XL', value: '2.25rem', cssVar: '--font-size-4xl', category: 'typography', subcategory: 'font-size', description: '36px' },

  { name: 'Line Height XS', value: '1.5', cssVar: '--line-height-xs', category: 'typography', subcategory: 'line-height' },
  { name: 'Line Height SM', value: '1.5', cssVar: '--line-height-sm', category: 'typography', subcategory: 'line-height' },
  { name: 'Line Height Base', value: '1.5', cssVar: '--line-height-base', category: 'typography', subcategory: 'line-height' },
  { name: 'Line Height LG', value: '1.5', cssVar: '--line-height-lg', category: 'typography', subcategory: 'line-height' },
  { name: 'Line Height XL', value: '1.4', cssVar: '--line-height-xl', category: 'typography', subcategory: 'line-height' },
  { name: 'Line Height 2XL', value: '1.3', cssVar: '--line-height-2xl', category: 'typography', subcategory: 'line-height' },
  { name: 'Line Height 3XL', value: '1.2', cssVar: '--line-height-3xl', category: 'typography', subcategory: 'line-height' },
  { name: 'Line Height 4XL', value: '1.2', cssVar: '--line-height-4xl', category: 'typography', subcategory: 'line-height' },
]

export const spacingTokens: DesignToken[] = [
  { name: 'Spacing 18', value: '4.5rem', cssVar: '--spacing-18', category: 'spacing', description: '72px' },
  { name: 'Spacing 88', value: '22rem', cssVar: '--spacing-88', category: 'spacing', description: '352px' },
  { name: 'Spacing 112', value: '28rem', cssVar: '--spacing-112', category: 'spacing', description: '448px' },
  { name: 'Spacing 128', value: '32rem', cssVar: '--spacing-128', category: 'spacing', description: '512px' },
]

export const radiusTokens: DesignToken[] = [
  { name: 'Radius SM', value: '0.25rem', cssVar: '--radius-sm', category: 'radius', description: '4px' },
  { name: 'Radius Default', value: '0.375rem', cssVar: '--radius', category: 'radius', description: '6px' },
  { name: 'Radius MD', value: '0.5rem', cssVar: '--radius-md', category: 'radius', description: '8px' },
  { name: 'Radius LG', value: '0.75rem', cssVar: '--radius-lg', category: 'radius', description: '12px' },
  { name: 'Radius XL', value: '1rem', cssVar: '--radius-xl', category: 'radius', description: '16px' },
  { name: 'Radius 2XL', value: '1.5rem', cssVar: '--radius-2xl', category: 'radius', description: '24px' },
]

export const shadowTokens: DesignToken[] = [
  { name: 'Shadow SM', value: '0 1px 3px rgba(22, 22, 20, 0.08), 0 1px 2px rgba(22, 22, 20, 0.06)', cssVar: '--shadow-sm', category: 'shadow' },
  { name: 'Shadow Default', value: '0 1px 3px rgba(22, 22, 20, 0.08), 0 1px 2px rgba(22, 22, 20, 0.06)', cssVar: '--shadow', category: 'shadow' },
  { name: 'Shadow MD', value: '0 4px 6px -1px rgba(22, 22, 20, 0.10), 0 2px 4px -2px rgba(22, 22, 20, 0.08)', cssVar: '--shadow-md', category: 'shadow' },
  { name: 'Shadow LG', value: '0 10px 15px -3px rgba(22, 22, 20, 0.12), 0 4px 6px -4px rgba(22, 22, 20, 0.08)', cssVar: '--shadow-lg', category: 'shadow' },
  { name: 'Shadow XL', value: '0 20px 25px -5px rgba(22, 22, 20, 0.14), 0 8px 10px -6px rgba(22, 22, 20, 0.10)', cssVar: '--shadow-xl', category: 'shadow' },
  { name: 'Shadow Card', value: '0 2px 8px -1px rgba(22, 22, 20, 0.08), 0 1px 3px -1px rgba(22, 22, 20, 0.06)', cssVar: '--shadow-card', category: 'shadow', description: 'Standard card shadow' },
  { name: 'Shadow Card Hover', value: '0 8px 20px -4px rgba(22, 22, 20, 0.12), 0 4px 8px -2px rgba(22, 22, 20, 0.08)', cssVar: '--shadow-card-hover', category: 'shadow', description: 'Card hover shadow' },
]

export const durationTokens: DesignToken[] = [
  { name: 'Duration 250', value: '250ms', cssVar: '--duration-250', category: 'duration' },
  { name: 'Duration 350', value: '350ms', cssVar: '--duration-350', category: 'duration' },
]

export const allTokens: DesignToken[] = [
  ...colorTokens,
  ...typographyTokens,
  ...spacingTokens,
  ...radiusTokens,
  ...shadowTokens,
  ...durationTokens,
]

export const tokensByCategory: Record<TokenCategory, DesignToken[]> = {
  color: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  shadow: shadowTokens,
  radius: radiusTokens,
  duration: durationTokens,
}

export function getTokensBySubcategory(category: TokenCategory, subcategory: string): DesignToken[] {
  return tokensByCategory[category].filter(token => token.subcategory === subcategory)
}

export function searchTokens(query: string): DesignToken[] {
  const lowerQuery = query.toLowerCase()
  return allTokens.filter(token =>
    token.name.toLowerCase().includes(lowerQuery) ||
    token.value.toLowerCase().includes(lowerQuery) ||
    token.description?.toLowerCase().includes(lowerQuery) ||
    token.subcategory?.toLowerCase().includes(lowerQuery)
  )
}
