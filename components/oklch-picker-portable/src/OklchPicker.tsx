import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { APCA_MAX, APCA_MIN, apcaCategory, calculateApcaContrast } from "./apca";
import {
  CMAX_DISPLAY,
  getDisplayCssAndGamut,
  isInGamut,
  oklchToCss,
  oklchToHex,
  parseCssToOklch,
} from "./color";
import { sampleAt } from "./plane";
import { axisLabels, pointerToUv, renderRaster, yValueForLabel } from "./render";
import type { OklchPickerProps, PickerChange, PickerSample, PickerState } from "./types";

const APCA_TARGET_PRESETS = [30, 45, 60, 75, 90];

const DEFAULT_STATE: PickerState = {
  plane: "HC_at_L",
  mode: "shape",
  gamut: "srgb",
  resolution: 256,
  L: 0.7,
  C: 0.16,
  h: 240,
  apcaBg: { L: 1, C: 0, h: 0 },
  apcaTargets: [45, 60, 75],
  apcaFixed: 60,
  maxChromaThreshold: 0.9,
};

function supportsDisplayP3(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  return CSS.supports("color", "color(display-p3 1 0 0)");
}

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function clampState(input: PickerState): PickerState {
  return {
    ...input,
    L: Math.max(0, Math.min(1, input.L)),
    C: Math.max(0, Math.min(CMAX_DISPLAY, input.C)),
    h: ((input.h % 360) + 360) % 360,
    resolution: input.resolution,
    apcaBg: {
      L: Math.max(0, Math.min(1, input.apcaBg.L)),
      C: Math.max(0, Math.min(CMAX_DISPLAY, input.apcaBg.C)),
      h: ((input.apcaBg.h % 360) + 360) % 360,
    },
    apcaTargets: [...new Set(input.apcaTargets)].sort((a, b) => a - b),
    apcaFixed: Math.max(APCA_MIN, Math.min(APCA_MAX, Math.round(input.apcaFixed))),
    maxChromaThreshold: Math.max(0.5, Math.min(1, input.maxChromaThreshold)),
  };
}

function isStandardPlane(plane: PickerState["plane"]): boolean {
  return plane === "HC_at_L" || plane === "LC_at_H" || plane === "HL_at_C";
}

function apcaFixedToV(apcaFixed: number): number {
  return (apcaFixed - APCA_MIN) / (APCA_MAX - APCA_MIN);
}

function areStatesEqual(a: PickerState, b: PickerState): boolean {
  if (a.plane !== b.plane) return false;
  if (a.mode !== b.mode) return false;
  if (a.gamut !== b.gamut) return false;
  if (a.resolution !== b.resolution) return false;
  if (a.L !== b.L || a.C !== b.C || a.h !== b.h) return false;
  if (a.apcaFixed !== b.apcaFixed) return false;
  if (a.maxChromaThreshold !== b.maxChromaThreshold) return false;
  if (a.apcaBg.L !== b.apcaBg.L || a.apcaBg.C !== b.apcaBg.C || a.apcaBg.h !== b.apcaBg.h) return false;
  if (a.apcaTargets.length !== b.apcaTargets.length) return false;
  for (let i = 0; i < a.apcaTargets.length; i += 1) {
    if (a.apcaTargets[i] !== b.apcaTargets[i]) return false;
  }
  return true;
}

function stateToSample(state: PickerState): PickerSample | null {
  let u: number | null = null;
  let v: number | null = null;

  if (state.plane === "HC_at_L") {
    u = state.h / 360;
    v = state.C / CMAX_DISPLAY;
  } else if (state.plane === "LC_at_H") {
    u = state.C / CMAX_DISPLAY;
    v = state.L;
  } else if (state.plane === "HL_at_C") {
    u = state.h / 360;
    v = state.L;
  } else if (state.plane === "AH_at_C") {
    u = state.h / 360;
    v = apcaFixedToV(state.apcaFixed);
  } else if (state.plane === "AC_at_H") {
    u = state.C / CMAX_DISPLAY;
    v = apcaFixedToV(state.apcaFixed);
  } else if (state.plane === "HC_at_APCA") {
    u = state.h / 360;
    v = state.C / CMAX_DISPLAY;
  }

  if (u === null || v === null) return null;
  return sampleAt(u, v, state);
}

function toChange(sample: PickerSample, state: PickerState): PickerChange | null {
  if (!sample.color || !sample.inGamut) return null;

  const lc = calculateApcaContrast(sample.color, state.apcaBg, state.gamut);
  const display = getDisplayCssAndGamut(sample.color, state.gamut);

  return {
    color: sample.color,
    css: display.css,
    hex: oklchToHex(sample.color),
    lcAgainstBackground: lc,
    gamut: state.gamut,
    plane: state.plane,
    mode: state.mode,
  };
}

function formatSample(sample: PickerSample | null, state: PickerState): {
  title: string;
  css: string;
  hex: string;
  lc: number | null;
  inGamut: boolean;
  apcaValue: number | null;
} {
  if (!sample || !sample.color) {
    return {
      title: "No color selected",
      css: "transparent",
      hex: "-",
      lc: null,
      inGamut: false,
      apcaValue: null,
    };
  }

  const display = getDisplayCssAndGamut(sample.color, state.gamut);
  const lc = sample.inGamut
    ? calculateApcaContrast(sample.color, state.apcaBg, state.gamut)
    : null;

  return {
    title: oklchToCss(sample.color),
    css: display.css,
    hex: oklchToHex(sample.color),
    lc,
    inGamut: sample.inGamut,
    apcaValue: sample.apcaValue,
  };
}

export function OklchPicker({ className, style, initialState, onChange }: OklchPickerProps) {
  const p3Supported = useMemo(() => supportsDisplayP3(), []);
  const [state, setState] = useState<PickerState>(() => {
    const canUseP3 = supportsDisplayP3();
    const preferredDefault = {
      ...DEFAULT_STATE,
      gamut: (canUseP3 ? "p3" : "srgb") as PickerState["gamut"],
    };
    const nextState = clampState({ ...preferredDefault, ...initialState });
    if (!canUseP3 && nextState.gamut === "p3") {
      return { ...nextState, gamut: "srgb" };
    }
    return nextState;
  });
  const [hovered, setHovered] = useState<PickerSample | null>(null);
  const [selected, setSelected] = useState<PickerSample | null>(null);
  const [apcaBgInput, setApcaBgInput] = useState(() => oklchToCss(clampState({ ...DEFAULT_STATE, ...initialState }).apcaBg));
  const [apcaBgError, setApcaBgError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const hoverPointRef = useRef<{ x: number; y: number } | null>(null);
  const hoverUvRef = useRef<{ u: number; v: number } | null>(null);
  const hoverCellRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const pendingEmitRef = useRef(false);
  const deferredState = useDeferredValue(state);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const labels = useMemo(() => axisLabels(deferredState), [deferredState]);

  const raster = useMemo(() => renderRaster(deferredState), [deferredState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", deferredState.gamut === "p3" ? ({ colorSpace: "display-p3" } as CanvasRenderingContext2DSettings) : undefined)
      ?? canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = raster.width;
    canvas.height = raster.height;
    const imageDataArray = raster.rgba as unknown as Uint8ClampedArray<ArrayBuffer>;

    let imageData: ImageData;
    try {
      imageData = new ImageData(
        imageDataArray,
        raster.width,
        raster.height,
        deferredState.gamut === "p3" ? ({ colorSpace: "display-p3" } as ImageDataSettings) : undefined
      );
    } catch {
      imageData = new ImageData(imageDataArray, raster.width, raster.height);
    }

    ctx.putImageData(imageData, 0, 0);
  }, [deferredState.gamut, raster]);

  const active = selected ?? hovered;
  const activeInfo = formatSample(active, state);
  const apcaBackgroundDisplay = getDisplayCssAndGamut(state.apcaBg, state.gamut);
  const standardPlaneActive = isStandardPlane(state.plane);
  const apcaModeGatingActive =
    state.mode === "apca" && standardPlaneActive;
  const apcaPlaneActive =
    state.plane === "AH_at_C" || state.plane === "AC_at_H" || state.plane === "HC_at_APCA";
  const apcaPassPercent = useMemo(() => {
    if (!apcaModeGatingActive || raster.apcaPassRatio === null) return null;
    return Math.round(raster.apcaPassRatio * 100);
  }, [apcaModeGatingActive, raster.apcaPassRatio]);

  const canvasWrapStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!apcaModeGatingActive && !apcaPlaneActive) return undefined;
    return {
      background: apcaBackgroundDisplay.css,
    };
  }, [apcaBackgroundDisplay.css, apcaModeGatingActive, apcaPlaneActive]);

  const setPartialState = useCallback((next: Partial<PickerState>, emit = false) => {
    if (emit) {
      pendingEmitRef.current = true;
    }
    setState((previous) => {
      const merged = clampState({ ...previous, ...next });
      const normalized = !p3Supported && merged.gamut === "p3"
        ? { ...merged, gamut: "srgb" as const }
        : merged;
      if (areStatesEqual(previous, normalized)) {
        return previous;
      }
      return normalized;
    });
  }, [p3Supported]);

  const toggleApcaTarget = (value: number) => {
    pendingEmitRef.current = true;
    setState((previous) => {
      const exists = previous.apcaTargets.includes(value);
      const nextTargets = exists
        ? previous.apcaTargets.filter((item) => item !== value)
        : [...previous.apcaTargets, value];
      const merged = clampState({ ...previous, apcaTargets: nextTargets });
      if (areStatesEqual(previous, merged)) return previous;
      return merged;
    });
  };

  const updateFromPointer = useCallback((clientX: number, clientY: number, select: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const uv = pointerToUv(clientX, clientY, rect);
    hoverUvRef.current = uv;
    const cellKey = `${Math.round(uv.u * (raster.effectiveResolution - 1))}:${Math.round(uv.v * (raster.effectiveResolution - 1))}`;
    if (!select && hoverCellRef.current === cellKey) {
      return;
    }
    hoverCellRef.current = cellKey;
    const nextSample = sampleAt(uv.u, uv.v, state);

    setHovered(nextSample);

    if (!select) return;

    if (!nextSample.color || !nextSample.inGamut) return;
    setSelected(nextSample);

    const nextState: Partial<PickerState> = {
      L: nextSample.color.L,
      C: nextSample.color.C,
      h: nextSample.color.h,
    };
    if (nextSample.apcaValue !== null) {
      nextState.apcaFixed = Math.round(nextSample.apcaValue);
    }

    setPartialState(nextState, true);
  }, [raster.effectiveResolution, state, setPartialState]);

  const scheduleHoverUpdate = useCallback((clientX: number, clientY: number) => {
    hoverPointRef.current = { x: clientX, y: clientY };
    if (hoverRafRef.current !== null) return;
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = null;
      const point = hoverPointRef.current;
      if (!point) return;
      hoverPointRef.current = null;
      updateFromPointer(point.x, point.y, false);
    });
  }, [updateFromPointer]);

  const applyApcaBackgroundInput = useCallback(() => {
    const parsed = parseCssToOklch(apcaBgInput);
    if (!parsed) {
      setApcaBgError("Invalid color expression");
      return;
    }
    setApcaBgError(null);
    setPartialState({ apcaBg: parsed }, true);
  }, [apcaBgInput, setPartialState]);

  useEffect(() => {
    const fromState = stateToSample(state);
    if (fromState) {
      setSelected(fromState);
    }
  }, [state]);

  useEffect(() => {
    if (!pendingEmitRef.current) return;
    pendingEmitRef.current = false;
    const callback = onChangeRef.current;
    if (!callback) return;
    const fromState = stateToSample(state);
    const payload = fromState ? toChange(fromState, state) : null;
    if (payload) {
      callback(payload);
    }
  }, [state]);

  useEffect(() => {
    setHovered((previous) => {
      if (!previous?.color) return previous;
      return { ...previous, inGamut: isInGamut(previous.color, state.gamut) };
    });
  }, [state.gamut]);

  useEffect(() => {
    const uv = hoverUvRef.current;
    if (!uv) return;
    hoverCellRef.current = null;
    setHovered(sampleAt(uv.u, uv.v, state));
  }, [state]);

  useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null) {
        cancelAnimationFrame(hoverRafRef.current);
      }
    };
  }, []);

  const markerStyle = (sample: PickerSample | null): React.CSSProperties | undefined => {
    if (!sample?.color) return undefined;
    return {
      left: `${sample.u * 100}%`,
      top: `${(1 - sample.v) * 100}%`,
    };
  };

  const selectedMarker = markerStyle(selected);
  const hoverMarker = markerStyle(hovered);

  const gridLines = [0.25, 0.5, 0.75];

  return (
    <section className={cx("oklch-picker", className)} style={style}>
      <div className="oklch-picker__sidebar">
        <h2 className="oklch-picker__title">OKLCH Picker</h2>
        <p className="oklch-picker__subtitle">2D gamut view with APCA target support and APCA planes.</p>

        <div className="oklch-picker__section">
          <h3 className="oklch-picker__section-title">OKLCH parameters</h3>

          <div className="oklch-picker__group">
            <label className="oklch-picker__label" htmlFor="plane">Plane</label>
            <select
              id="plane"
              className="oklch-picker__select"
              value={state.plane}
              onChange={(event) => setPartialState({ plane: event.target.value as PickerState["plane"] }, true)}
            >
              <option value="HC_at_L">H × C @ L</option>
              <option value="LC_at_H">L × C @ H</option>
              <option value="HL_at_C">H × L @ C</option>
              <option value="AH_at_C">APCA × H @ C</option>
              <option value="AC_at_H">APCA × C @ H</option>
              <option value="HC_at_APCA">H × C @ APCA</option>
            </select>
          </div>

          <div className="oklch-picker__row">
            <div className="oklch-picker__group">
              <label className="oklch-picker__label" htmlFor="mode">Mode</label>
              <select
                id="mode"
                className="oklch-picker__select"
                value={state.mode}
                onChange={(event) => setPartialState({ mode: event.target.value as PickerState["mode"] }, true)}
              >
                <option value="shape">Shape</option>
                <option value="maxChroma">Max Chroma</option>
                <option value="apca">APCA</option>
              </select>
            </div>
            <div className="oklch-picker__group">
              <label className="oklch-picker__label" htmlFor="gamut">Gamut</label>
              <select
                id="gamut"
                className="oklch-picker__select"
                value={state.gamut}
                onChange={(event) => setPartialState({ gamut: event.target.value as PickerState["gamut"] }, true)}
              >
                <option value="srgb">sRGB</option>
                <option value="p3">Display P3</option>
              </select>
            </div>
          </div>

          <div className="oklch-picker__group">
            <label className="oklch-picker__label" htmlFor="resolution">Resolution</label>
            <select
              id="resolution"
              className="oklch-picker__select"
              value={state.resolution}
              onChange={(event) => setPartialState({ resolution: Number(event.target.value) as PickerState["resolution"] }, true)}
            >
              <option value={128}>128</option>
              <option value={256}>256</option>
              <option value={512}>512</option>
            </select>
            {raster.effectiveResolution !== state.resolution && (
              <p className="oklch-picker__hint">
                Rendering at {raster.effectiveResolution}px for responsiveness.
              </p>
            )}
          </div>

          <div className="oklch-picker__group">
            <label className="oklch-picker__label" htmlFor="lightness">L {(state.L * 100).toFixed(1)}%</label>
            <input
              id="lightness"
              className="oklch-picker__slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.L}
              onChange={(event) => setPartialState({ L: Number(event.target.value) }, true)}
            />
          </div>

          <div className="oklch-picker__group">
            <label className="oklch-picker__label" htmlFor="chroma">C {state.C.toFixed(3)}</label>
            <input
              id="chroma"
              className="oklch-picker__slider"
              type="range"
              min={0}
              max={CMAX_DISPLAY}
              step={0.001}
              value={state.C}
              onChange={(event) => setPartialState({ C: Number(event.target.value) }, true)}
            />
          </div>

          <div className="oklch-picker__group">
            <label className="oklch-picker__label" htmlFor="hue">h {state.h.toFixed(1)}°</label>
            <input
              id="hue"
              className="oklch-picker__slider"
              type="range"
              min={0}
              max={360}
              step={1}
              value={state.h}
              onChange={(event) => setPartialState({ h: Number(event.target.value) }, true)}
            />
          </div>

          {state.mode === "maxChroma" && (
            <div className="oklch-picker__group">
              <label className="oklch-picker__label" htmlFor="max-chroma-threshold">Max-chroma threshold {(state.maxChromaThreshold * 100).toFixed(0)}%</label>
              <input
                id="max-chroma-threshold"
                className="oklch-picker__slider"
                type="range"
                min={0.5}
                max={1}
                step={0.01}
                value={state.maxChromaThreshold}
                onChange={(event) => setPartialState({ maxChromaThreshold: Number(event.target.value) }, true)}
              />
            </div>
          )}
        </div>

        <div className="oklch-picker__section">
          <h3 className="oklch-picker__section-title">APCA background</h3>

          {apcaPlaneActive && (
            <div className="oklch-picker__group">
              <label className="oklch-picker__label" htmlFor="fixed-apca">
                {state.plane === "HC_at_APCA" ? "Fixed APCA" : "Inspector APCA"} Lc {state.apcaFixed}
              </label>
              <input
                id="fixed-apca"
                className="oklch-picker__slider"
                type="range"
                min={APCA_MIN}
                max={APCA_MAX}
                step={1}
                value={state.apcaFixed}
                onChange={(event) => setPartialState({ apcaFixed: Number(event.target.value) }, true)}
              />
            </div>
          )}

          <div className="oklch-picker__group">
            <label className="oklch-picker__label" htmlFor="bg-lightness">APCA background L {(state.apcaBg.L * 100).toFixed(0)}%</label>
            <input
              id="bg-lightness"
              className="oklch-picker__slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.apcaBg.L}
              onChange={(event) => {
                const nextBg = { ...state.apcaBg, L: Number(event.target.value) };
                setPartialState({ apcaBg: nextBg }, true);
                setApcaBgInput(oklchToCss(nextBg));
                setApcaBgError(null);
              }}
            />
          </div>

          <div className="oklch-picker__row">
            <div className="oklch-picker__group">
              <label className="oklch-picker__label" htmlFor="bg-chroma">APCA bg C {state.apcaBg.C.toFixed(3)}</label>
              <input
                id="bg-chroma"
                className="oklch-picker__slider"
                type="range"
                min={0}
                max={CMAX_DISPLAY}
                step={0.001}
                value={state.apcaBg.C}
                onChange={(event) => {
                  const nextBg = { ...state.apcaBg, C: Number(event.target.value) };
                  setPartialState({ apcaBg: nextBg }, true);
                  setApcaBgInput(oklchToCss(nextBg));
                  setApcaBgError(null);
                }}
              />
            </div>
            <div className="oklch-picker__group">
              <label className="oklch-picker__label" htmlFor="bg-hue">APCA bg h {state.apcaBg.h.toFixed(0)}°</label>
              <input
                id="bg-hue"
                className="oklch-picker__slider"
                type="range"
                min={0}
                max={360}
                step={1}
                value={state.apcaBg.h}
                onChange={(event) => {
                  const nextBg = { ...state.apcaBg, h: Number(event.target.value) };
                  setPartialState({ apcaBg: nextBg }, true);
                  setApcaBgInput(oklchToCss(nextBg));
                  setApcaBgError(null);
                }}
              />
            </div>
          </div>

          <div className="oklch-picker__group">
            <label className="oklch-picker__label" htmlFor="bg-color-input">APCA background color</label>
            <div className="oklch-picker__bg-input-row">
              <span
                className="oklch-picker__bg-swatch"
                style={{ background: getDisplayCssAndGamut(state.apcaBg, state.gamut).css }}
              />
              <input
                id="bg-color-input"
                className="oklch-picker__select"
                type="text"
                value={apcaBgInput}
                onChange={(event) => {
                  setApcaBgInput(event.target.value);
                  if (apcaBgError) setApcaBgError(null);
                }}
                onBlur={applyApcaBackgroundInput}
              />
              <button
                type="button"
                className="oklch-picker__target"
                onClick={applyApcaBackgroundInput}
              >
                Apply
              </button>
            </div>
            {apcaBgError && <p className="oklch-picker__hint">{apcaBgError}</p>}
          </div>
        </div>

        <div className="oklch-picker__section">
          <h3 className="oklch-picker__section-title">APCA targets</h3>
          <div className="oklch-picker__targets">
            {APCA_TARGET_PRESETS.map((target) => (
              <button
                key={target}
                type="button"
                className={cx("oklch-picker__target", state.apcaTargets.includes(target) && "is-active")}
                onClick={() => toggleApcaTarget(target)}
              >
                Lc {target}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="oklch-picker__canvas-area">
        <div className="oklch-picker__meta">
          <div>
            <strong>{labels.x}</strong> x <strong>{labels.y}</strong>
          </div>
          <div className="oklch-picker__meta-fixed">
            <span>{labels.fixed}</span>
            {(apcaModeGatingActive || apcaPlaneActive) && (
              <span className="oklch-picker__meta-chip">APCA bg active</span>
            )}
            {apcaPassPercent !== null && (
              <span className="oklch-picker__meta-chip">{apcaPassPercent}% pass</span>
            )}
          </div>
        </div>

        <div className="oklch-picker__canvas-wrap" style={canvasWrapStyle}>
          <canvas
            key={`oklch-canvas-${state.gamut}`}
            ref={canvasRef}
            className="oklch-picker__canvas"
            onMouseMove={(event) => scheduleHoverUpdate(event.clientX, event.clientY)}
            onClick={(event) => updateFromPointer(event.clientX, event.clientY, true)}
            onMouseLeave={() => {
              hoverUvRef.current = null;
              hoverCellRef.current = null;
              setHovered(null);
            }}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              if (touch) scheduleHoverUpdate(touch.clientX, touch.clientY);
            }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (touch) updateFromPointer(touch.clientX, touch.clientY, true);
            }}
          />

          {gridLines.map((line) => (
            <div
              key={`h-${line}`}
              className="oklch-picker__grid-line"
              style={{ top: `${line * 100}%` }}
            />
          ))}

          {gridLines.map((line) => (
            <div
              key={`v-${line}`}
              className="oklch-picker__grid-line is-vertical"
              style={{ left: `${line * 100}%` }}
            />
          ))}

          {hoverMarker && <span className="oklch-picker__marker is-hover" style={hoverMarker} />}
          {selectedMarker && <span className="oklch-picker__marker is-selected" style={selectedMarker} />}

          <div className="oklch-picker__corner-label is-top">{yValueForLabel(1, state)}</div>
          <div className="oklch-picker__corner-label is-bottom">{yValueForLabel(0, state)}</div>
          <div className="oklch-picker__corner-label is-left">0</div>
          <div className="oklch-picker__corner-label is-right">
            {state.plane === "HC_at_L" || state.plane === "HL_at_C" || state.plane === "AH_at_C" || state.plane === "HC_at_APCA"
              ? "360"
              : CMAX_DISPLAY.toFixed(2)}
          </div>
        </div>

        <div className="oklch-picker__inspector">
          <div className="oklch-picker__swatch" style={{ background: activeInfo.css }} />
          <div className="oklch-picker__inspector-main">
            <div className="oklch-picker__inspector-title">{activeInfo.title}</div>
            <div className="oklch-picker__inspector-sub">HEX {activeInfo.hex}</div>
            <div className="oklch-picker__inspector-sub">
              {activeInfo.inGamut ? `In ${state.gamut.toUpperCase()} gamut` : `Out of ${state.gamut.toUpperCase()} gamut`}
            </div>
          </div>
          <div className="oklch-picker__apca">
            {activeInfo.lc !== null ? (
              <>
                <div className="oklch-picker__apca-value">Lc {activeInfo.lc.toFixed(1)}</div>
                <div className={cx("oklch-picker__apca-tag", `is-${apcaCategory(activeInfo.lc).tone}`)}>{apcaCategory(activeInfo.lc).label}</div>
              </>
            ) : (
              <div className="oklch-picker__apca-value">Lc -</div>
            )}
          </div>
        </div>

        <div className="oklch-picker__apca-preview" style={{ background: apcaBackgroundDisplay.css }}>
          <div className="oklch-picker__apca-preview-label">APCA background preview</div>
          <div className="oklch-picker__apca-preview-text" style={{ color: activeInfo.css }}>
            Aa Sample text on selected background
          </div>
          <div className="oklch-picker__apca-preview-sub">
            {apcaPlaneActive
              ? "Colors in this plane are generated to match APCA target(s) on this background."
              : apcaModeGatingActive
                ? "Available colors are filtered by APCA targets."
                : "Switch Mode to APCA to filter available colors by this background."}
          </div>
        </div>

        <div className="oklch-picker__targets-readout">
          {state.apcaTargets.map((target) => {
            const lc = activeInfo.lc;
            const passed = lc !== null && lc >= target;
            return (
              <span key={target} className={cx("oklch-picker__target-pill", passed ? "is-pass" : "is-fail")}>
                Lc {target}: {passed ? "pass" : "fail"}
              </span>
            );
          })}
          {activeInfo.apcaValue !== null && (
            <span className="oklch-picker__target-pill is-neutral">Generated for Lc {activeInfo.apcaValue.toFixed(0)}</span>
          )}
        </div>
      </div>
    </section>
  );
}
