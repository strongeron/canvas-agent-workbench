import { calculateApcaContrastWithBackgroundY, precomputeApcaBackgroundY } from "./apca";
import { CMAX_DISPLAY, cmaxBinarySearch, oklchToRgb, rgbInGamut, rgbToBytes, wrapHue } from "./color";
import { sampleAt } from "./plane";
import type { Oklch, PickerState } from "./types";

const DIM_ALPHA = 48;
const APCA_PLANE_MAX_RESOLUTION = 96;
const APCA_MODE_MAX_RESOLUTION = 192;
const MAX_CHROMA_MODE_MAX_RESOLUTION = 256;

function isStandardPlane(plane: PickerState["plane"]): boolean {
  return plane === "HC_at_L" || plane === "LC_at_H" || plane === "HL_at_C";
}

function standardPlaneColor(state: PickerState, u: number, v: number): Oklch {
  if (state.plane === "HC_at_L") {
    return { L: state.L, C: v * CMAX_DISPLAY, h: wrapHue(u * 360) };
  }
  if (state.plane === "LC_at_H") {
    return { L: v, C: u * CMAX_DISPLAY, h: state.h };
  }
  return { L: v, C: state.C, h: wrapHue(u * 360) };
}

export interface RenderResult {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  effectiveResolution: number;
  apcaPassRatio: number | null;
}

export function renderRaster(state: PickerState): RenderResult {
  const standardPlane = isStandardPlane(state.plane);
  let effectiveResolution: number = state.resolution;
  if (!standardPlane) {
    effectiveResolution = Math.min(state.resolution, APCA_PLANE_MAX_RESOLUTION);
  } else if (state.mode === "apca") {
    effectiveResolution = Math.min(state.resolution, APCA_MODE_MAX_RESOLUTION);
  } else if (state.mode === "maxChroma") {
    effectiveResolution = Math.min(state.resolution, MAX_CHROMA_MODE_MAX_RESOLUTION);
  }

  const width = effectiveResolution;
  const height = effectiveResolution;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const apcaBgY = standardPlane && state.mode === "apca"
    ? precomputeApcaBackgroundY(state.apcaBg, state.gamut)
    : null;
  const minApcaTarget = state.apcaTargets.length > 0
    ? Math.min(...state.apcaTargets)
    : Number.NEGATIVE_INFINITY;
  const cmaxByX =
    standardPlane && state.mode === "maxChroma" && state.plane === "HC_at_L"
      ? new Float32Array(width).fill(-1)
      : null;
  const cmaxByY =
    standardPlane && state.mode === "maxChroma" && state.plane === "LC_at_H"
      ? new Float32Array(height).fill(-1)
      : null;
  let apcaEvaluated = 0;
  let apcaPassed = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = width === 1 ? 0 : x / (width - 1);
      const v = height === 1 ? 0 : 1 - y / (height - 1);
      const index = (y * width + x) * 4;
      let color: Oklch;
      let rgb: [number, number, number];

      if (standardPlane) {
        color = standardPlaneColor(state, u, v);
        rgb = oklchToRgb(color, state.gamut);
        if (!rgbInGamut(rgb[0], rgb[1], rgb[2])) {
          rgba[index] = 0;
          rgba[index + 1] = 0;
          rgba[index + 2] = 0;
          rgba[index + 3] = 0;
          continue;
        }
      } else {
        const sample = sampleAt(u, v, state);
        if (!sample.color || !sample.inGamut) {
          rgba[index] = 0;
          rgba[index + 1] = 0;
          rgba[index + 2] = 0;
          rgba[index + 3] = 0;
          continue;
        }
        color = sample.color;
        rgb = oklchToRgb(color, state.gamut);
      }

      const [r, g, b] = rgb;
      const [r8, g8, b8] = rgbToBytes(r, g, b);
      rgba[index] = r8;
      rgba[index + 1] = g8;
      rgba[index + 2] = b8;
      rgba[index + 3] = 255;

      if (!standardPlane) {
        continue;
      }

      if (state.mode === "maxChroma") {
        let cmax = 0;
        if (cmaxByX) {
          cmax = cmaxByX[x];
          if (cmax < 0) {
            cmax = cmaxBinarySearch(color.L, color.h, state.gamut);
            cmaxByX[x] = cmax;
          }
        } else if (cmaxByY) {
          cmax = cmaxByY[y];
          if (cmax < 0) {
            cmax = cmaxBinarySearch(color.L, color.h, state.gamut);
            cmaxByY[y] = cmax;
          }
        } else {
          cmax = cmaxBinarySearch(color.L, color.h, state.gamut);
        }
        const ratio = cmax > 0 ? color.C / cmax : 0;
        if (ratio < state.maxChromaThreshold) {
          rgba[index + 3] = DIM_ALPHA;
        }
      }

      if (state.mode === "apca") {
        const lc = calculateApcaContrastWithBackgroundY(color, apcaBgY ?? 0, state.gamut);
        apcaEvaluated += 1;
        const passesAnyTarget = lc >= minApcaTarget;
        if (passesAnyTarget) {
          apcaPassed += 1;
        }
        if (!passesAnyTarget) {
          rgba[index + 3] = DIM_ALPHA;
        }
      }
    }
  }

  return {
    width,
    height,
    rgba,
    effectiveResolution,
    apcaPassRatio: apcaEvaluated > 0 ? apcaPassed / apcaEvaluated : null,
  };
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
