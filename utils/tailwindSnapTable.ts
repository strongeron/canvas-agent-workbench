// Tailwind v3 default spacing/sizing scale (also used by w-* and h-*).
// Hard-coded here because the canvas overlay's snap-on-drag runs in the
// browser, where tailwind.config.js is not directly available. If/when
// the project customizes theme.spacing in tailwind.config.js, swap this
// to a server endpoint that resolves the config and ships the table at
// boot — the consuming surface (nearestSnap, formatSizeClass) stays the
// same.

export interface TailwindSnapEntry {
  /** The numeric/special token after the prefix, e.g. "4", "0.5", "px". */
  token: string
  /** Pixel value of the resolved entry. */
  px: number
}

/**
 * Tailwind's default size/spacing scale, sorted ascending by px. Includes
 * the special "px" entry (1px). Excludes fractional tokens like "1/2" and
 * keyword tokens like "auto"/"full"/"screen"/"min"/"max"/"fit" — those
 * don't snap to a discrete pixel value and are handled separately by
 * the caller if needed.
 */
export const TAILWIND_DEFAULT_SIZE_SCALE: ReadonlyArray<TailwindSnapEntry> = [
  { token: "0", px: 0 },
  { token: "px", px: 1 },
  { token: "0.5", px: 2 },
  { token: "1", px: 4 },
  { token: "1.5", px: 6 },
  { token: "2", px: 8 },
  { token: "2.5", px: 10 },
  { token: "3", px: 12 },
  { token: "3.5", px: 14 },
  { token: "4", px: 16 },
  { token: "5", px: 20 },
  { token: "6", px: 24 },
  { token: "7", px: 28 },
  { token: "8", px: 32 },
  { token: "9", px: 36 },
  { token: "10", px: 40 },
  { token: "11", px: 44 },
  { token: "12", px: 48 },
  { token: "14", px: 56 },
  { token: "16", px: 64 },
  { token: "20", px: 80 },
  { token: "24", px: 96 },
  { token: "28", px: 112 },
  { token: "32", px: 128 },
  { token: "36", px: 144 },
  { token: "40", px: 160 },
  { token: "44", px: 176 },
  { token: "48", px: 192 },
  { token: "52", px: 208 },
  { token: "56", px: 224 },
  { token: "60", px: 240 },
  { token: "64", px: 256 },
  { token: "72", px: 288 },
  { token: "80", px: 320 },
  { token: "96", px: 384 },
]

/**
 * Return the snap-table entry whose px is closest to the input. Ties
 * resolve to the smaller entry (the table is sorted ascending and we
 * keep the first match). Always returns an entry — for empty input
 * scales the caller should guard before calling.
 */
export function nearestSnap(
  px: number,
  scale: ReadonlyArray<TailwindSnapEntry> = TAILWIND_DEFAULT_SIZE_SCALE
): TailwindSnapEntry {
  if (scale.length === 0) {
    throw new Error("nearestSnap requires a non-empty scale")
  }
  // Clamp non-finite/negative to 0 so callers don't have to.
  const target = Number.isFinite(px) && px > 0 ? px : 0
  let best = scale[0]
  let bestDist = Math.abs(target - best.px)
  for (let i = 1; i < scale.length; i += 1) {
    const entry = scale[i]
    const dist = Math.abs(target - entry.px)
    if (dist < bestDist) {
      best = entry
      bestDist = dist
    }
  }
  return best
}

/**
 * Format a snap-table entry into a Tailwind utility class for the given
 * prefix. For example: formatSizeClass("w", { token: "4", px: 16 }) → "w-4".
 * The "px" token rounds to its dotless form (e.g. "w-px").
 */
export function formatSizeClass(prefix: string, entry: TailwindSnapEntry): string {
  return `${prefix}-${entry.token}`
}
