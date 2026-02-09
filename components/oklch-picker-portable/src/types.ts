import type { CSSProperties } from "react";

export type Gamut = "srgb" | "p3";

export type ViewMode = "shape" | "maxChroma" | "apca";

export type StandardPlane = "HC_at_L" | "LC_at_H" | "HL_at_C";
export type ApcaPlane = "AH_at_C" | "AC_at_H" | "HC_at_APCA";
export type Plane = StandardPlane | ApcaPlane;

export function isApcaPlane(plane: Plane): plane is ApcaPlane {
  return plane === "AH_at_C" || plane === "AC_at_H" || plane === "HC_at_APCA";
}

export interface Oklch {
  L: number;
  C: number;
  h: number;
}

export interface PickerSample {
  color: Oklch | null;
  inGamut: boolean;
  lc: number | null;
  apcaValue: number | null;
  u: number;
  v: number;
}

export interface PickerState {
  plane: Plane;
  mode: ViewMode;
  gamut: Gamut;
  resolution: 256 | 512 | 1024;
  L: number;
  C: number;
  h: number;
  apcaBg: Oklch;
  apcaTargets: number[];
  apcaFixed: number;
  maxChromaThreshold: number;
}

export interface PickerChange {
  color: Oklch;
  css: string;
  hex: string;
  lcAgainstBackground: number;
  gamut: Gamut;
  plane: Plane;
  mode: ViewMode;
}

export interface OklchPickerProps {
  className?: string;
  style?: CSSProperties;
  initialState?: Partial<PickerState>;
  onChange?: (value: PickerChange) => void;
}
