import Color from "colorjs.io";
import type { Gamut, Oklch } from "./types";

export const CMAX_DISPLAY = 0.4;
const CMAX_UPPER_BOUND = 0.5;
const EPSILON = 1e-4;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function wrapHue(value: number): number {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function normalizeOklch(color: Oklch): Oklch {
  return {
    L: clamp01(color.L),
    C: Math.max(0, color.C),
    h: wrapHue(color.h),
  };
}

export function toColor(oklch: Oklch): Color {
  const safe = normalizeOklch(oklch);
  return new Color("oklch", [safe.L, safe.C, safe.h]);
}

export function oklchToRgb(color: Oklch, gamut: Gamut): [number, number, number] {
  const target = gamut === "srgb" ? "srgb" : "p3";
  const converted = toColor(color).to(target);
  const [r, g, b] = converted.coords;
  return [r, g, b];
}

export function rgbInGamut(r: number, g: number, b: number): boolean {
  const eps = 1e-6;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;
}

export function isInGamut(color: Oklch, gamut: Gamut): boolean {
  const [r, g, b] = oklchToRgb(color, gamut);
  return rgbInGamut(r, g, b);
}

export function clampRgb(r: number, g: number, b: number): [number, number, number] {
  return [clamp01(r), clamp01(g), clamp01(b)];
}

export function rgbToBytes(r: number, g: number, b: number): [number, number, number] {
  const [cr, cg, cb] = clampRgb(r, g, b);
  return [Math.round(cr * 255), Math.round(cg * 255), Math.round(cb * 255)];
}

export function oklchToCss(color: Oklch): string {
  const safe = normalizeOklch(color);
  return `oklch(${(safe.L * 100).toFixed(1)}% ${safe.C.toFixed(4)} ${safe.h.toFixed(1)})`;
}

export function oklchToHex(color: Oklch): string {
  const converted = toColor(color).to("srgb").toString({ format: "hex" });
  return converted;
}

export function parseCssToOklch(input: string): Oklch | null {
  const value = input.trim();
  if (!value) return null;
  try {
    const color = new Color(value).to("oklch");
    const [LRaw, CRaw, hRaw] = color.coords;
    if (!Number.isFinite(LRaw) || !Number.isFinite(CRaw) || !Number.isFinite(hRaw)) {
      return null;
    }
    return normalizeOklch({
      L: Number(LRaw),
      C: Math.max(0, Number(CRaw)),
      h: Number(hRaw),
    });
  } catch {
    return null;
  }
}

export function getDisplayCssAndGamut(color: Oklch, gamut: Gamut): { css: string; inGamut: boolean } {
  const [r, g, b] = oklchToRgb(color, gamut);
  const inRange = rgbInGamut(r, g, b);
  const [cr, cg, cb] = clampRgb(r, g, b);

  if (gamut === "srgb") {
    return {
      css: `rgb(${Math.round(cr * 255)}, ${Math.round(cg * 255)}, ${Math.round(cb * 255)})`,
      inGamut: inRange,
    };
  }

  return {
    css: `color(display-p3 ${cr.toFixed(4)} ${cg.toFixed(4)} ${cb.toFixed(4)})`,
    inGamut: inRange,
  };
}

export function cmaxBinarySearch(L: number, h: number, gamut: Gamut): number {
  const safeL = clamp01(L);
  const safeH = wrapHue(h);

  if (safeL <= 0 || safeL >= 1) return 0;

  let low = 0;
  let high = CMAX_UPPER_BOUND;

  const topIsIn = isInGamut({ L: safeL, C: high, h: safeH }, gamut);
  if (topIsIn) return high;

  while (high - low > EPSILON) {
    const mid = (high + low) / 2;
    const inRange = isInGamut({ L: safeL, C: mid, h: safeH }, gamut);
    if (inRange) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}
