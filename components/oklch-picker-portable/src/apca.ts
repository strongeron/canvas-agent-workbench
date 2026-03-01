import { APCAcontrast, displayP3toY, sRGBtoY } from "apca-w3";
import { apcach, apcachToCss, crToBg } from "apcach";
import { clampRgb, isInGamut, oklchToRgb } from "./color";
import type { Gamut, Oklch } from "./types";

export const APCA_MIN = 15;
export const APCA_MAX = 105;

function toApcaLuminanceY(color: Oklch, gamut: Gamut): number {
  const [r, g, b] = clampRgb(...oklchToRgb(color, gamut));
  if (gamut === "srgb") {
    return sRGBtoY([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]);
  }
  return displayP3toY([r, g, b]);
}

function cssToOklch(css: string): Oklch | null {
  const match = css.match(/oklch\(([^)]+)\)/);
  if (!match) return null;

  const parts = match[1].trim().split(/\s+/);
  if (parts.length < 3) return null;

  const lRaw = parts[0].replace("%", "");
  const cRaw = parts[1];
  const hRaw = parts[2];

  const l = Number.parseFloat(lRaw);
  const c = Number.parseFloat(cRaw);
  const h = Number.parseFloat(hRaw);

  if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) return null;

  return {
    L: parts[0].includes("%") ? l / 100 : l,
    C: c,
    h,
  };
}

export function calculateApcaContrast(foreground: Oklch, background: Oklch, gamut: Gamut): number {
  const bgY = toApcaLuminanceY(background, gamut);
  return calculateApcaContrastWithBackgroundY(foreground, bgY, gamut);
}

export function calculateApcaContrastWithBackgroundY(foreground: Oklch, backgroundY: number, gamut: Gamut): number {
  const fgY = toApcaLuminanceY(foreground, gamut);
  const lc = APCAcontrast(fgY, backgroundY);
  return typeof lc === "number" ? Math.abs(lc) : 0;
}

export function precomputeApcaBackgroundY(background: Oklch, gamut: Gamut): number {
  return toApcaLuminanceY(background, gamut);
}

export function generateApcaColor(
  targetLc: number,
  chroma: number,
  hue: number,
  background: Oklch,
  gamut: Gamut
): Oklch | null {
  const safeTarget = Math.max(APCA_MIN, Math.min(APCA_MAX, targetLc));
  const space = gamut === "p3" ? "p3" : "srgb";
  const bgCss = `oklch(${(background.L * 100).toFixed(2)}% ${background.C.toFixed(4)} ${background.h.toFixed(2)})`;

  try {
    const generated = apcach(crToBg(bgCss, safeTarget), chroma, hue, undefined, space);
    const css = apcachToCss(generated, "oklch");
    const parsed = cssToOklch(css);
    if (!parsed) return null;
    if (!isInGamut(parsed, gamut)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function apcaCategory(lc: number): { label: string; tone: "good" | "warn" | "fail" } {
  if (lc >= 75) return { label: "Excellent", tone: "good" };
  if (lc >= 60) return { label: "Good", tone: "good" };
  if (lc >= 45) return { label: "Minimum", tone: "warn" };
  return { label: "Below minimum", tone: "fail" };
}
