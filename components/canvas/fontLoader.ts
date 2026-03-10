import type { FontPairPreset } from "./fontPairs"

export interface FontLoadResult {
  loadedFamilies: string[]
  skippedFamilies: string[]
}

const GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "monospace",
  "ui-monospace",
  "cursive",
  "fantasy",
  "emoji",
  "math",
  "fangsong",
  "arial",
  "helvetica",
  "georgia",
  "times",
  "times new roman",
  "courier",
  "courier new",
  "verdana",
  "tahoma",
  "trebuchet ms",
  "segoe ui",
])

const GOOGLE_FONT_ALLOWLIST: Record<string, string> = {
  Inter: "Inter:wght@400;500;600;700;800",
  Manrope: "Manrope:wght@400;500;600;700;800",
  "Space Grotesk": "Space+Grotesk:wght@400;500;600;700",
  "DM Sans": "DM+Sans:wght@400;500;700",
  "Playfair Display": "Playfair+Display:wght@400;500;600;700",
  "Source Serif 4": "Source+Serif+4:wght@400;500;600;700",
  "Source Sans 3": "Source+Sans+3:wght@400;500;600;700",
  Poppins: "Poppins:wght@400;500;600;700",
  "Open Sans": "Open+Sans:wght@400;500;600;700",
  "IBM Plex Sans": "IBM+Plex+Sans:wght@400;500;600;700",
  "Instrument Serif": "Instrument+Serif:ital@0;1",
  "DM Serif Display": "DM+Serif+Display:ital@0;1",
  "Plus Jakarta Sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
  Merriweather: "Merriweather:wght@400;700",
  Lora: "Lora:wght@400;500;600;700",
  Lato: "Lato:wght@400;700",
  Outfit: "Outfit:wght@400;500;600;700",
  Archivo: "Archivo:wght@400;500;600;700",
  "Nunito Sans": "Nunito+Sans:wght@400;600;700",
}

const loadedFamilies = new Set<string>()
const loadingFamilies = new Map<string, Promise<void>>()

function normalizeFamilyName(value: string) {
  return value.trim().replace(/^['"]+|['"]+$/g, "")
}

function extractFamiliesFromStack(fontStack: string) {
  return fontStack
    .split(",")
    .map((part) => normalizeFamilyName(part))
    .filter((name) => name.length > 0)
    .filter((name) => !GENERIC_FONT_FAMILIES.has(name.toLowerCase()))
}

function familyStyleId(family: string) {
  return `canvas-google-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
}

function ensureGoogleFontLoaded(family: string) {
  if (typeof document === "undefined") {
    return Promise.resolve()
  }
  if (loadedFamilies.has(family)) {
    return Promise.resolve()
  }

  const existingPromise = loadingFamilies.get(family)
  if (existingPromise) {
    return existingPromise
  }

  const styleId = familyStyleId(family)
  const existingLink = document.getElementById(styleId)
  if (existingLink) {
    loadedFamilies.add(family)
    return Promise.resolve()
  }

  const query = GOOGLE_FONT_ALLOWLIST[family]
  const url = `https://fonts.googleapis.com/css2?family=${query}&display=swap`

  const loadPromise = new Promise<void>((resolve, reject) => {
    const link = document.createElement("link")
    link.id = styleId
    link.rel = "stylesheet"
    link.href = url

    const timeoutId = window.setTimeout(() => {
      loadingFamilies.delete(family)
      reject(new Error(`Timed out while loading web font: ${family}`))
    }, 8000)

    link.onload = () => {
      window.clearTimeout(timeoutId)
      loadedFamilies.add(family)
      loadingFamilies.delete(family)
      resolve()
    }
    link.onerror = () => {
      window.clearTimeout(timeoutId)
      loadingFamilies.delete(family)
      reject(new Error(`Failed to load web font: ${family}`))
    }

    document.head.appendChild(link)
  })

  loadingFamilies.set(family, loadPromise)
  return loadPromise
}

export function getSupportedWebFontFamilies(fontStack: string) {
  return extractFamiliesFromStack(fontStack).filter((family) => Boolean(GOOGLE_FONT_ALLOWLIST[family]))
}

export async function ensureFontPairLoaded(pair: FontPairPreset): Promise<FontLoadResult> {
  const families = Array.from(
    new Set([
      ...extractFamiliesFromStack(pair.displayFamily),
      ...extractFamiliesFromStack(pair.bodyFamily),
    ])
  )
  const loadable = families.filter((family) => Boolean(GOOGLE_FONT_ALLOWLIST[family]))
  const skippedFamilies = families.filter((family) => !GOOGLE_FONT_ALLOWLIST[family])

  for (const family of loadable) {
    await ensureGoogleFontLoaded(family)
  }

  return {
    loadedFamilies: loadable,
    skippedFamilies,
  }
}
