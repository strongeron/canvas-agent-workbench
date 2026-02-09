import { APCA_MAX, APCA_MIN, generateApcaColor } from "./apca";
import { CMAX_DISPLAY, clamp01, isInGamut, wrapHue } from "./color";
import type { PickerSample, PickerState, Plane, Oklch } from "./types";

function apcaFromV(v: number): number {
  return APCA_MIN + clamp01(v) * (APCA_MAX - APCA_MIN);
}

function standardPlaneColor(plane: Plane, u: number, v: number, state: PickerState): Oklch | null {
  const safeU = clamp01(u);
  const safeV = clamp01(v);

  if (plane === "HC_at_L") {
    return { L: state.L, C: safeV * CMAX_DISPLAY, h: safeU * 360 };
  }

  if (plane === "LC_at_H") {
    return { L: safeV, C: safeU * CMAX_DISPLAY, h: state.h };
  }

  if (plane === "HL_at_C") {
    return { L: safeV, C: state.C, h: safeU * 360 };
  }

  return null;
}

function apcaPlaneColor(plane: Plane, u: number, v: number, state: PickerState): { color: Oklch | null; target: number | null } {
  const safeU = clamp01(u);
  const safeV = clamp01(v);

  if (plane === "AH_at_C") {
    const target = apcaFromV(safeV);
    const color = generateApcaColor(target, state.C, safeU * 360, state.apcaBg, state.gamut);
    return { color, target };
  }

  if (plane === "AC_at_H") {
    const target = apcaFromV(safeV);
    const color = generateApcaColor(target, safeU * CMAX_DISPLAY, state.h, state.apcaBg, state.gamut);
    return { color, target };
  }

  if (plane === "HC_at_APCA") {
    const color = generateApcaColor(state.apcaFixed, safeV * CMAX_DISPLAY, safeU * 360, state.apcaBg, state.gamut);
    return { color, target: state.apcaFixed };
  }

  return { color: null, target: null };
}

export function sampleAt(u: number, v: number, state: PickerState): PickerSample {
  const normalizedU = clamp01(u);
  const normalizedV = clamp01(v);

  const base = standardPlaneColor(state.plane, normalizedU, normalizedV, state);
  if (base) {
    const color = {
      L: clamp01(base.L),
      C: Math.max(0, base.C),
      h: wrapHue(base.h),
    };
    return {
      color,
      inGamut: isInGamut(color, state.gamut),
      lc: null,
      apcaValue: null,
      u: normalizedU,
      v: normalizedV,
    };
  }

  const apcaGenerated = apcaPlaneColor(state.plane, normalizedU, normalizedV, state);
  return {
    color: apcaGenerated.color,
    inGamut: apcaGenerated.color ? isInGamut(apcaGenerated.color, state.gamut) : false,
    lc: null,
    apcaValue: apcaGenerated.target,
    u: normalizedU,
    v: normalizedV,
  };
}
