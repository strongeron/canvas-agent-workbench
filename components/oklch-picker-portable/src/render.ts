import { calculateApcaContrast } from "./apca";
import { CMAX_DISPLAY, cmaxBinarySearch, oklchToRgb, rgbToBytes } from "./color";
import { sampleAt } from "./plane";
import type { PickerState } from "./types";

const DIM_ALPHA = 90;

function isStandardPlane(plane: PickerState["plane"]): boolean {
  return plane === "HC_at_L" || plane === "LC_at_H" || plane === "HL_at_C";
}

export interface RenderResult {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  effectiveResolution: number;
}

export function renderRaster(state: PickerState): RenderResult {
  const standardPlane = isStandardPlane(state.plane);
  const effectiveResolution = standardPlane ? state.resolution : Math.min(state.resolution, 256);

  const width = effectiveResolution;
  const height = effectiveResolution;
  const rgba = new Uint8ClampedArray(width * height * 4);

  const sortedTargets = [...state.apcaTargets].sort((a, b) => b - a);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = width === 1 ? 0 : x / (width - 1);
      const v = height === 1 ? 0 : 1 - y / (height - 1);
      const sample = sampleAt(u, v, state);
      const index = (y * width + x) * 4;

      if (!sample.color || !sample.inGamut) {
        rgba[index] = 0;
        rgba[index + 1] = 0;
        rgba[index + 2] = 0;
        rgba[index + 3] = 0;
        continue;
      }

      const [r, g, b] = oklchToRgb(sample.color, state.gamut);
      const [r8, g8, b8] = rgbToBytes(r, g, b);
      rgba[index] = r8;
      rgba[index + 1] = g8;
      rgba[index + 2] = b8;
      rgba[index + 3] = 255;

      if (!standardPlane) {
        continue;
      }

      if (state.mode === "maxChroma") {
        const cmax = cmaxBinarySearch(sample.color.L, sample.color.h, state.gamut);
        const ratio = cmax > 0 ? sample.color.C / cmax : 0;
        if (ratio < state.maxChromaThreshold) {
          rgba[index + 3] = DIM_ALPHA;
        }
      }

      if (state.mode === "apca") {
        const lc = calculateApcaContrast(sample.color, state.apcaBg, state.gamut);
        const passesAnyTarget = sortedTargets.length === 0 || sortedTargets.some((target) => lc >= target);
        if (!passesAnyTarget) {
          rgba[index + 3] = DIM_ALPHA;
        }
      }
    }
  }

  return { width, height, rgba, effectiveResolution };
}

export function pointerToUv(
  clientX: number,
  clientY: number,
  bounds: { left: number; top: number; width: number; height: number }
): { u: number; v: number } {
  const px = Math.max(0, Math.min(bounds.width, clientX - bounds.left));
  const py = Math.max(0, Math.min(bounds.height, clientY - bounds.top));
  const u = bounds.width <= 0 ? 0 : px / bounds.width;
  const v = bounds.height <= 0 ? 0 : 1 - py / bounds.height;
  return { u, v };
}

export function axisLabels(state: PickerState): { x: string; y: string; fixed: string } {
  switch (state.plane) {
    case "HC_at_L":
      return { x: "Hue", y: "Chroma", fixed: `L ${(state.L * 100).toFixed(0)}%` };
    case "LC_at_H":
      return { x: "Chroma", y: "Lightness", fixed: `h ${state.h.toFixed(0)}°` };
    case "HL_at_C":
      return { x: "Hue", y: "Lightness", fixed: `C ${state.C.toFixed(3)}` };
    case "AH_at_C":
      return { x: "Hue", y: "APCA Lc", fixed: `C ${state.C.toFixed(3)}` };
    case "AC_at_H":
      return { x: "Chroma", y: "APCA Lc", fixed: `h ${state.h.toFixed(0)}°` };
    case "HC_at_APCA":
      return { x: "Hue", y: "Chroma", fixed: `APCA Lc ${state.apcaFixed}` };
    default:
      return { x: "X", y: "Y", fixed: "" };
  }
}

export function yValueForLabel(v: number, state: PickerState): string {
  if (state.plane === "AH_at_C" || state.plane === "AC_at_H") {
    const value = 15 + Math.max(0, Math.min(1, v)) * 90;
    return `Lc ${value.toFixed(0)}`;
  }

  if (state.plane === "HC_at_L" || state.plane === "HC_at_APCA") {
    return (Math.max(0, Math.min(1, v)) * CMAX_DISPLAY).toFixed(3);
  }

  return `${(Math.max(0, Math.min(1, v)) * 100).toFixed(0)}%`;
}
