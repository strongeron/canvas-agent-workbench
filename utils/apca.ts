interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export const APCA_TARGETS = [15, 30, 45, 60, 75, 90] as const
export const DEFAULT_CONTRAST_TARGET_LC = 60
export const DEFAULT_COLOR_MODEL = "oklch" as const

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function parseColor(input: string): RGBA | null {
  const value = input.trim().toLowerCase()

  if (!value) return null

  if (value.startsWith("#")) {
    const hex = value.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1
      return { r: r / 255, g: g / 255, b: b / 255, a }
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      return { r: r / 255, g: g / 255, b: b / 255, a }
    }
    return null
  }

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/)
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length < 3) return null

    const parseChannel = (raw: string) => {
      if (raw.endsWith("%")) {
        return clamp(parseFloat(raw) / 100)
      }
      return clamp(parseFloat(raw) / 255)
    }

    const r = parseChannel(parts[0])
    const g = parseChannel(parts[1])
    const b = parseChannel(parts[2])
    const a = parts[3] ? clamp(parseFloat(parts[3])) : 1
    return { r, g, b, a }
  }

  return null
}

function blend(fg: RGBA, bg: RGBA): RGBA {
  const alpha = fg.a + bg.a * (1 - fg.a)
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / alpha,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / alpha,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / alpha,
    a: alpha,
  }
}

function sRGBtoLinear(channel: number) {
  if (channel <= 0.04045) return channel / 12.92
  return Math.pow((channel + 0.055) / 1.055, 2.4)
}

function luminance(rgb: RGBA) {
  const r = sRGBtoLinear(rgb.r)
  const g = sRGBtoLinear(rgb.g)
  const b = sRGBtoLinear(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function apcaContrast(textColor: string, backgroundColor: string): number | null {
  // NOTE: Lightweight APCA approximation; swap with official implementation when precision matters.
  const text = parseColor(textColor)
  const background = parseColor(backgroundColor)
  if (!text || !background) return null

  const bg = background.a < 1 ? blend(background, { r: 1, g: 1, b: 1, a: 1 }) : background
  const fg = text.a < 1 ? blend(text, bg) : text

  let Ybg = luminance(bg)
  let Ytxt = luminance(fg)

  const blkThrs = 0.022
  const blkClmp = 1.414
  const scaleBoW = 1.14
  const scaleWoB = 1.14

  if (Ybg < blkThrs) {
    Ybg += Math.pow(blkThrs - Ybg, blkClmp)
  }
  if (Ytxt < blkThrs) {
    Ytxt += Math.pow(blkThrs - Ytxt, blkClmp)
  }

  let sapc
  if (Ybg > Ytxt) {
    sapc = (Math.pow(Ybg, 0.56) - Math.pow(Ytxt, 0.57)) * scaleBoW
  } else {
    sapc = (Math.pow(Ybg, 0.65) - Math.pow(Ytxt, 0.62)) * scaleWoB
  }

  const Lc = sapc * 100
  if (Math.abs(Lc) < 15) return 0
  return Lc
}

export function formatLc(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—"
  const rounded = Math.round(value)
  const sign = rounded > 0 ? "" : "-"
  return `${sign}Lc ${Math.abs(rounded)}`
}

export function getApcaStatus(value: number | null, target: number) {
  if (value === null || Number.isNaN(value)) return "unknown"
  return Math.abs(value) >= target ? "pass" : "fail"
}
