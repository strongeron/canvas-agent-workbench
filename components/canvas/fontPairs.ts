export interface FontPairPreset {
  id: string
  label: string
  description: string
  displayFamily: string
  bodyFamily: string
}

/**
 * Starter set follows web typography best practices:
 * - max two families per board (display + body)
 * - body font chosen for readability at small sizes
 * - strong personality/readability contrast between display and body
 * - always include robust fallback stacks
 */
export const FONT_PAIR_PRESETS: FontPairPreset[] = [
  {
    id: "manrope-inter",
    label: "Manrope + Inter",
    description: "Default SaaS baseline. Strong hierarchy with high body readability.",
    displayFamily: "\"Manrope\", \"Inter\", system-ui, sans-serif",
    bodyFamily: "\"Inter\", system-ui, sans-serif",
  },
  {
    id: "space-grotesk-dm-sans",
    label: "Space Grotesk + DM Sans",
    description: "Product-first, modern UI voice. Works well for feature-heavy hero sections.",
    displayFamily: "\"Space Grotesk\", \"DM Sans\", system-ui, sans-serif",
    bodyFamily: "\"DM Sans\", system-ui, sans-serif",
  },
  {
    id: "ibm-plex-sans-inter",
    label: "IBM Plex Sans + Inter",
    description: "Technical and trustworthy. Great for dev-tool and enterprise positioning.",
    displayFamily: "\"IBM Plex Sans\", \"Inter\", system-ui, sans-serif",
    bodyFamily: "\"Inter\", system-ui, sans-serif",
  },
  {
    id: "poppins-open-sans",
    label: "Poppins + Open Sans",
    description: "Friendly and broad-audience. Good for growth pages and onboarding marketing.",
    displayFamily: "\"Poppins\", \"Open Sans\", system-ui, sans-serif",
    bodyFamily: "\"Open Sans\", system-ui, sans-serif",
  },
  {
    id: "playfair-source-serif",
    label: "Playfair Display + Source Serif 4",
    description: "Editorial premium tone. Best for storytelling-led landing pages.",
    displayFamily: "\"Playfair Display\", \"Source Serif 4\", serif",
    bodyFamily: "\"Source Serif 4\", Georgia, serif",
  },
  {
    id: "lora-source-sans-3",
    label: "Lora + Source Sans 3",
    description: "Balanced classic-modern mix. Works for case studies and long-form sections.",
    displayFamily: "\"Lora\", \"Source Sans 3\", serif",
    bodyFamily: "\"Source Sans 3\", \"Inter\", system-ui, sans-serif",
  },
  {
    id: "instrument-serif-plus-jakarta",
    label: "Instrument Serif + Plus Jakarta Sans",
    description: "Expressive brand voice with modern, neutral body support.",
    displayFamily: "\"Instrument Serif\", \"Playfair Display\", serif",
    bodyFamily: "\"Plus Jakarta Sans\", \"Inter\", system-ui, sans-serif",
  },
  {
    id: "dm-serif-display-dm-sans",
    label: "DM Serif Display + DM Sans",
    description: "High-contrast brand direction using a cohesive superfamily.",
    displayFamily: "\"DM Serif Display\", \"DM Sans\", serif",
    bodyFamily: "\"DM Sans\", system-ui, sans-serif",
  },
  {
    id: "archivo-nunito",
    label: "Archivo + Nunito Sans",
    description: "Bold headline with approachable body tone. Good for B2B + creator crossover.",
    displayFamily: "\"Archivo\", \"Inter\", system-ui, sans-serif",
    bodyFamily: "\"Nunito Sans\", \"Inter\", system-ui, sans-serif",
  },
  {
    id: "outfit-inter",
    label: "Outfit + Inter",
    description: "Clean geometric direction with stable UI readability at scale.",
    displayFamily: "\"Outfit\", \"Inter\", system-ui, sans-serif",
    bodyFamily: "\"Inter\", system-ui, sans-serif",
  },
]

export function getFontPairById(pairId: string | undefined | null): FontPairPreset | null {
  if (!pairId) return null
  return FONT_PAIR_PRESETS.find((pair) => pair.id === pairId) || null
}

export function buildFontPairThemeVars(pair: FontPairPreset) {
  return {
    "--font-family-display": pair.displayFamily,
    "--font-family-sans": pair.bodyFamily,
  }
}
