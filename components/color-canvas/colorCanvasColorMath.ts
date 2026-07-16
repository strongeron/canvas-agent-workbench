import type { ColorCanvasNode, RelativeColorSpec } from "../../types/colorCanvas"
import type { OklchColor, RGBA } from "./colorCanvasShared"

export function nodeMatchesRole(node: ColorCanvasNode, role: NonNullable<ColorCanvasNode["role"]>) {
  if (node.role === role) return true
  const haystack = `${node.label} ${node.cssVar ?? ""}`.toLowerCase()
  const keywords: Record<NonNullable<ColorCanvasNode["role"]>, string[]> = {
    text: ["text", "foreground", "content", "fg"],
    surface: ["surface", "background", "canvas", "bg"],
    border: ["border", "stroke"],
    icon: ["icon"],
    accent: ["accent", "brand", "primary", "secondary"],
  }
  return keywords[role].some((keyword) => haystack.includes(keyword))
}

export function getNextPosition(nodes: ColorCanvasNode[]) {
  const baseX = 120
  const baseY = 80
  const spacingX = 220
  const spacingY = 120
  const index = nodes.length
  const col = index % 3
  const row = Math.floor(index / 3)
  return {
    x: baseX + col * spacingX,
    y: baseY + row * spacingY,
  }
}

export function formatRelativeChannel(
  mode: string | undefined,
  value: number | undefined,
  unit: string,
  transform: (value: number) => number = (val) => val
) {
  if (!mode || mode === "inherit") return "inherit"
  if (value === undefined || Number.isNaN(value)) return "inherit"
  const nextValue = transform(value)
  if (Number.isNaN(nextValue)) return "inherit"
  const sign = mode === "delta" && nextValue > 0 ? "+" : ""
  return `${sign}${nextValue}${unit}`
}

export function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function wrapDegrees(value: number) {
  const mod = value % 360
  return mod < 0 ? mod + 360 : mod
}

export function normalizeRelativeChroma(value: number) {
  if (Number.isNaN(value)) return value
  if (Math.abs(value) > 1) return value / 100
  return value
}

export function applyRelativeChannel(
  baseValue: number,
  mode: string | undefined,
  value: number | undefined,
  percentScale: number,
  normalize: (value: number) => number
) {
  if (!mode || mode === "inherit") return baseValue
  if (value === undefined || Number.isNaN(value)) return baseValue
  const normalized = normalize(value)
  if (mode === "absolute") {
    return normalized / percentScale
  }
  return baseValue + normalized / percentScale
}

export function resolveRelativeOklch(
  base: OklchColor,
  spec: RelativeColorSpec
): OklchColor {
  const nextL = applyRelativeChannel(base.l, spec.lMode, spec.lValue, 100, (value) => value)
  const nextC = applyRelativeChannel(base.c, spec.cMode, spec.cValue, 1, (value) =>
    normalizeRelativeChroma(value)
  )
  const nextH = applyRelativeChannel(base.h, spec.hMode, spec.hValue, 1, (value) => value)
  const nextA = applyRelativeChannel(base.a, spec.alphaMode, spec.alphaValue, 100, (value) => value)
  return {
    l: clampValue(nextL ?? base.l, 0, 1),
    c: Math.max(0, nextC ?? base.c),
    h: wrapDegrees(nextH ?? base.h),
    a: clampValue(nextA ?? base.a, 0, 1),
  }
}

export function rgbaToCss(color: RGBA) {
  const r = Math.round(clampValue(color.r, 0, 1) * 255)
  const g = Math.round(clampValue(color.g, 0, 1) * 255)
  const b = Math.round(clampValue(color.b, 0, 1) * 255)
  const a = clampValue(color.a, 0, 1)
  if (a >= 1) return `rgb(${r} ${g} ${b})`
  return `rgb(${r} ${g} ${b} / ${Number(a.toFixed(3))})`
}

export function rgbaToHex(color: RGBA) {
  const toChannel = (value: number) =>
    Math.round(clampValue(value, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${toChannel(color.r)}${toChannel(color.g)}${toChannel(color.b)}`
}

export function parseOklch(input: string): { l: number; c: number; h: number; a: number } | null {
  const match = input.trim().toLowerCase().match(/^oklch\(([^)]+)\)$/)
  if (!match) return null
  const body = match[1]
  const [channelsPart, alphaPart] = body.split("/")
  const parts = channelsPart.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) return null
  const parsePercent = (raw: string) => {
    const value = parseFloat(raw)
    if (Number.isNaN(value)) return null
    if (raw.includes("%") || value > 1) return value / 100
    return value
  }
  const parseHue = (raw: string) => {
    const value = parseFloat(raw)
    if (Number.isNaN(value)) return null
    return value
  }
  const l = parsePercent(parts[0])
  if (l === null) return null
  const c = parsePercent(parts[1])
  if (c === null) return null
  const h = parseHue(parts[2])
  if (h === null) return null
  let a = 1
  if (alphaPart) {
    const alphaRaw = alphaPart.trim()
    if (alphaRaw) {
      const alphaValue = parseFloat(alphaRaw)
      if (Number.isNaN(alphaValue)) return null
      a = alphaRaw.includes("%") || alphaValue > 1 ? alphaValue / 100 : alphaValue
    }
  }
  return { l: clampValue(l, 0, 1), c: Math.max(0, c), h, a: clampValue(a, 0, 1) }
}

export function parseDisplayP3(input: string): RGBA | null {
  const match = input.trim().toLowerCase().match(/^color\(display-p3\s+([^)]+)\)$/)
  if (!match) return null
  const body = match[1].trim()
  const normalized = body.replace(/\s*\/\s*/g, " / ")
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const slashIndex = tokens.indexOf("/")
  const channels = slashIndex !== -1 ? tokens.slice(0, slashIndex) : tokens
  const alphaToken = slashIndex !== -1 ? tokens[slashIndex + 1] : undefined
  if (channels.length < 3) return null

  const parseChannel = (raw: string) => {
    if (raw.endsWith("%")) {
      return clampValue(parseFloat(raw) / 100, 0, 1)
    }
    const numeric = parseFloat(raw)
    if (Number.isNaN(numeric)) return null
    return clampValue(numeric, 0, 1)
  }

  const r = parseChannel(channels[0])
  const g = parseChannel(channels[1])
  const b = parseChannel(channels[2])
  if (r === null || g === null || b === null) return null
  let a = 1
  if (alphaToken) {
    const alphaValue = parseFloat(alphaToken)
    if (!Number.isNaN(alphaValue)) {
      a = alphaToken.includes("%") || alphaValue > 1 ? alphaValue / 100 : alphaValue
      a = clampValue(a, 0, 1)
    }
  }
  return { r, g, b, a }
}

export function displayP3ToSrgb(color: RGBA): RGBA {
  const r = srgbToLinear(clampValue(color.r, 0, 1))
  const g = srgbToLinear(clampValue(color.g, 0, 1))
  const b = srgbToLinear(clampValue(color.b, 0, 1))

  const x = 0.4865709486 * r + 0.2656676932 * g + 0.1982172852 * b
  const y = 0.2289745641 * r + 0.6917385218 * g + 0.0792869141 * b
  const z = 0.0451133819 * g + 1.0439443689 * b

  const rLinear = 3.2409699419 * x - 1.5373831776 * y - 0.4986107603 * z
  const gLinear = -0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z
  const bLinear = 0.0556300797 * x - 0.2039769589 * y + 1.0569715142 * z

  return {
    r: clampValue(linearToSrgb(rLinear), 0, 1),
    g: clampValue(linearToSrgb(gLinear), 0, 1),
    b: clampValue(linearToSrgb(bLinear), 0, 1),
    a: color.a,
  }
}

export function oklchToLinearSrgb(color: { l: number; c: number; h: number }) {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const a = C * Math.cos(H)
  const b = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = L - 0.0894841775 * a - 1.291485548 * b

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

export function isOutOfGamut(color: { r: number; g: number; b: number }) {
  return color.r < 0 || color.r > 1 || color.g < 0 || color.g > 1 || color.b < 0 || color.b > 1
}

export function oklchToDisplayP3Css(color: { l: number; c: number; h: number; a?: number }) {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const aLab = C * Math.cos(H)
  const bLab = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * aLab + 0.2158037573 * bLab
  const mRoot = L - 0.1055613458 * aLab - 0.0638541728 * bLab
  const sRoot = L - 0.0894841775 * aLab - 1.291485548 * bLab

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  const x = 1.2270138511 * l - 0.5577999807 * m + 0.281256149 * s
  const y = -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s
  const z = -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s

  const rLinear = 2.4934969119 * x - 0.9313836179 * y - 0.4027107845 * z
  const gLinear = -0.8294889696 * x + 1.7626640603 * y + 0.0236246858 * z
  const bLinear = 0.0358458302 * x - 0.0761723893 * y + 0.956884524 * z

  const r = clampValue(linearToSrgb(rLinear), 0, 1)
  const g = clampValue(linearToSrgb(gLinear), 0, 1)
  const b = clampValue(linearToSrgb(bLinear), 0, 1)
  const alpha = clampValue(color.a ?? 1, 0, 1)
  const format = (value: number) => Number(value.toFixed(4))
  if (alpha >= 1) return `color(display-p3 ${format(r)} ${format(g)} ${format(b)})`
  return `color(display-p3 ${format(r)} ${format(g)} ${format(b)} / ${format(alpha)})`
}

export function srgbToLinear(channel: number) {
  if (channel <= 0.04045) return channel / 12.92
  return Math.pow((channel + 0.055) / 1.055, 2.4)
}

export function linearToSrgb(channel: number) {
  if (channel <= 0.0031308) return channel * 12.92
  return 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
}

export function srgbToOklch(color: RGBA): { l: number; c: number; h: number } | null {
  const r = srgbToLinear(clampValue(color.r, 0, 1))
  const g = srgbToLinear(clampValue(color.g, 0, 1))
  const b = srgbToLinear(clampValue(color.b, 0, 1))

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)

  const L = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot
  const A = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot
  const B = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot

  const C = Math.sqrt(A * A + B * B)
  const H = wrapDegrees((Math.atan2(B, A) * 180) / Math.PI)
  return { l: clampValue(L, 0, 1), c: C, h: H }
}

export function oklchToSrgb(color: { l: number; c: number; h: number; a?: number }): RGBA | null {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const a = C * Math.cos(H)
  const bLab = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * a + 0.2158037573 * bLab
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * bLab
  const sRoot = L - 0.0894841775 * a - 1.291485548 * bLab

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  const rLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const r = clampValue(linearToSrgb(rLinear), 0, 1)
  const g = clampValue(linearToSrgb(gLinear), 0, 1)
  const bOut = clampValue(linearToSrgb(bLinear), 0, 1)
  return { r, g, b: bOut, a: color.a ?? 1 }
}
