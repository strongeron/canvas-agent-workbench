import { useEffect, useMemo, useRef, useState } from "react";
import { APCA_MAX, APCA_MIN, apcaCategory, calculateApcaContrast } from "./apca";
import { CMAX_DISPLAY, getDisplayCssAndGamut, oklchToCss, oklchToHex } from "./color";
import { sampleAt } from "./plane";
import { axisLabels, pointerToUv, renderRaster, yValueForLabel } from "./render";
import type { OklchPickerProps, PickerChange, PickerSample, PickerState } from "./types";

const APCA_TARGET_PRESETS = [30, 45, 60, 75, 90];

const DEFAULT_STATE: PickerState = {
  plane: "HC_at_L",
  mode: "shape",
  gamut: "srgb",
  resolution: 512,
  L: 0.7,
  C: 0.16,
  h: 240,
  apcaBg: { L: 1, C: 0, h: 0 },
  apcaTargets: [45, 60, 75],
  apcaFixed: 60,
  maxChromaThreshold: 0.9,
};

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

  return {
    title: oklchToCss(sample.color),
    css: display.css,
    hex: oklchToHex(sample.color),
    lc: sample.lc,
    inGamut: sample.inGamut,
    apcaValue: sample.apcaValue,
  };
}

function sampleWithComputedLc(sample: PickerSample, state: PickerState): PickerSample {
  if (!sample.color || !sample.inGamut) {
    return sample;
  }

  const lc = calculateApcaContrast(sample.color, state.apcaBg, state.gamut);
  return {
    ...sample,
    lc,
  };
}

export function OklchPicker({ className, style, initialState, onChange }: OklchPickerProps) {
  const [state, setState] = useState<PickerState>(() => clampState({ ...DEFAULT_STATE, ...initialState }));
  const [hovered, setHovered] = useState<PickerSample | null>(null);
  const [selected, setSelected] = useState<PickerSample | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const labels = useMemo(() => axisLabels(state), [state]);

  const raster = useMemo(
    () => renderRaster(state),
    [
      state.apcaBg.C,
      state.apcaBg.L,
      state.apcaBg.h,
      state.apcaFixed,
      state.apcaTargets,
      state.C,
      state.L,
      state.gamut,
      state.h,
      state.maxChromaThreshold,
      state.mode,
      state.plane,
      state.resolution,
    ]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", state.gamut === "p3" ? ({ colorSpace: "display-p3" } as CanvasRenderingContext2DSettings) : undefined)
      ?? canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = raster.width;
    canvas.height = raster.height;

    // Copy into a fresh ArrayBuffer-backed typed array to satisfy ImageData typings
    const imageBuffer = new Uint8ClampedArray(raster.rgba.length);
    imageBuffer.set(raster.rgba);

    let imageData: ImageData;
    try {
      imageData = new ImageData(
        imageBuffer,
        raster.width,
        raster.height,
        state.gamut === "p3" ? ({ colorSpace: "display-p3" } as ImageDataSettings) : undefined
      );
    } catch {
      imageData = new ImageData(imageBuffer, raster.width, raster.height);
    }

    ctx.putImageData(imageData, 0, 0);
  }, [raster, state.gamut]);

  const active = selected ?? hovered;
  const activeInfo = formatSample(active, state);

  const setPartialState = (next: Partial<PickerState>) => {
    setState((previous) => clampState({ ...previous, ...next }));
  };

  const toggleApcaTarget = (value: number) => {
    setState((previous) => {
      const exists = previous.apcaTargets.includes(value);
      const nextTargets = exists
        ? previous.apcaTargets.filter((item) => item !== value)
        : [...previous.apcaTargets, value];
      return clampState({ ...previous, apcaTargets: nextTargets });
    });
  };

  const updateFromPointer = (clientX: number, clientY: number, select: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const uv = pointerToUv(clientX, clientY, rect);
    const nextSample = sampleWithComputedLc(sampleAt(uv.u, uv.v, state), state);

    setHovered(nextSample);

    if (!select) return;

    if (!nextSample.color || !nextSample.inGamut) return;
    setSelected(nextSample);

    const payload = toChange(nextSample, state);
    if (payload && onChange) {
      onChange(payload);
    }

    setPartialState({
      L: nextSample.color.L,
      C: nextSample.color.C,
      h: nextSample.color.h,
    });
  };

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

        <div className="oklch-picker__group">
          <label className="oklch-picker__label" htmlFor="plane">Plane</label>
          <select
            id="plane"
            className="oklch-picker__select"
            value={state.plane}
            onChange={(event) => setPartialState({ plane: event.target.value as PickerState["plane"] })}
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
              onChange={(event) => setPartialState({ mode: event.target.value as PickerState["mode"] })}
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
              onChange={(event) => setPartialState({ gamut: event.target.value as PickerState["gamut"] })}
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
            onChange={(event) => setPartialState({ resolution: Number(event.target.value) as PickerState["resolution"] })}
          >
            <option value={256}>256</option>
            <option value={512}>512</option>
            <option value={1024}>1024</option>
          </select>
          {raster.effectiveResolution !== state.resolution && (
            <p className="oklch-picker__hint">APCA planes are rendered at up to 256 for responsiveness.</p>
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
            onChange={(event) => setPartialState({ L: Number(event.target.value) })}
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
            onChange={(event) => setPartialState({ C: Number(event.target.value) })}
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
            onChange={(event) => setPartialState({ h: Number(event.target.value) })}
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
              onChange={(event) => setPartialState({ maxChromaThreshold: Number(event.target.value) })}
            />
          </div>
        )}

        {state.plane === "HC_at_APCA" && (
          <div className="oklch-picker__group">
            <label className="oklch-picker__label" htmlFor="fixed-apca">Fixed APCA Lc {state.apcaFixed}</label>
            <input
              id="fixed-apca"
              className="oklch-picker__slider"
              type="range"
              min={APCA_MIN}
              max={APCA_MAX}
              step={1}
              value={state.apcaFixed}
              onChange={(event) => setPartialState({ apcaFixed: Number(event.target.value) })}
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
            onChange={(event) => setPartialState({ apcaBg: { ...state.apcaBg, L: Number(event.target.value) } })}
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
              onChange={(event) => setPartialState({ apcaBg: { ...state.apcaBg, C: Number(event.target.value) } })}
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
              onChange={(event) => setPartialState({ apcaBg: { ...state.apcaBg, h: Number(event.target.value) } })}
            />
          </div>
        </div>

        <div className="oklch-picker__group">
          <p className="oklch-picker__label">APCA target levels</p>
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
          <div className="oklch-picker__meta-fixed">{labels.fixed}</div>
        </div>

        <div className="oklch-picker__canvas-wrap">
          <canvas
            ref={canvasRef}
            className="oklch-picker__canvas"
            onMouseMove={(event) => updateFromPointer(event.clientX, event.clientY, false)}
            onClick={(event) => updateFromPointer(event.clientX, event.clientY, true)}
            onMouseLeave={() => setHovered(null)}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              if (touch) updateFromPointer(touch.clientX, touch.clientY, false);
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
