import { useMemo, useState } from "react"

import { ColorPickerField } from "../components/color-picker"
import {
  OklchPicker,
  type PickerChange,
  type PickerState,
} from "../components/oklch-picker-portable/src"

interface PickerPreset {
  id: string
  label: string
  description: string
  initialState: Partial<PickerState>
}

const PRESETS: PickerPreset[] = [
  {
    id: "shape-hc",
    label: "Shape • H×C @ L",
    description: "Default free selection in hue/chroma at fixed lightness.",
    initialState: {
      mode: "shape",
      plane: "HC_at_L",
      gamut: "p3",
      resolution: 256,
      L: 0.62,
      C: 0.2,
      h: 290,
    },
  },
  {
    id: "shape-lc",
    label: "Shape • L×C @ H",
    description: "Inspect lightness/chroma at a fixed hue for ramps.",
    initialState: {
      mode: "shape",
      plane: "LC_at_H",
      gamut: "p3",
      resolution: 256,
      h: 210,
      L: 0.58,
      C: 0.14,
    },
  },
  {
    id: "max-chroma",
    label: "Max Chroma",
    description: "Highlights the most saturated region in the selected gamut.",
    initialState: {
      mode: "maxChroma",
      plane: "HC_at_L",
      gamut: "p3",
      resolution: 256,
      maxChromaThreshold: 0.92,
      L: 0.66,
      C: 0.17,
      h: 24,
    },
  },
  {
    id: "apca-filter",
    label: "APCA Filter",
    description: "Dims colors that do not pass selected APCA targets.",
    initialState: {
      mode: "apca",
      plane: "HC_at_L",
      gamut: "p3",
      resolution: 256,
      apcaBg: { L: 0.16, C: 0.02, h: 260 },
      apcaTargets: [60, 75],
      L: 0.74,
      C: 0.11,
      h: 240,
    },
  },
  {
    id: "apca-plane-ah",
    label: "APCA Plane • A×H @ C",
    description: "Generates colors by APCA target against the chosen background.",
    initialState: {
      mode: "apca",
      plane: "AH_at_C",
      gamut: "p3",
      resolution: 256,
      C: 0.11,
      apcaFixed: 60,
      apcaBg: { L: 0.95, C: 0.01, h: 240 },
      h: 250,
    },
  },
  {
    id: "apca-plane-fixed",
    label: "APCA Plane • H×C @ APCA",
    description: "Keeps APCA fixed and lets hue/chroma vary.",
    initialState: {
      mode: "apca",
      plane: "HC_at_APCA",
      gamut: "p3",
      resolution: 256,
      apcaFixed: 60,
      apcaBg: { L: 0.95, C: 0.01, h: 240 },
      L: 0.62,
      C: 0.12,
      h: 250,
    },
  },
]

function supportsDisplayP3(): boolean {
  if (typeof window === "undefined") return false
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false
  return CSS.supports("color", "color(display-p3 1 0 0)")
}

function formatSelection(selection: PickerChange | null): string {
  if (!selection) return "No color selected yet."
  return `${selection.css} • ${selection.hex} • Lc ${selection.lcAgainstBackground.toFixed(1)}`
}

export function OklchPickerLab() {
  const p3Supported = useMemo(() => supportsDisplayP3(), [])
  const [presetId, setPresetId] = useState(PRESETS[0].id)
  const [instanceVersion, setInstanceVersion] = useState(0)
  const [selection, setSelection] = useState<PickerChange | null>(null)
  const [bridgeValue, setBridgeValue] = useState("oklch(62% 0.2 280)")

  const activePreset = useMemo(
    () => PRESETS.find((preset) => preset.id === presetId) ?? PRESETS[0],
    [presetId]
  )

  return (
    <div className="h-full overflow-auto bg-gray-100 p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        <header className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-gray-900">Color Picker Lab</h2>
          <p className="mt-1 text-sm text-gray-600">
            Interactive state review for shape, max-chroma, APCA filtering, and APCA planes.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Display P3 support: <strong>{p3Supported ? "Enabled" : "Not available in this browser"}</strong>
          </p>
        </header>

        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">State Presets</h3>
            <div className="mt-3 space-y-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setPresetId(preset.id)
                    setSelection(null)
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    preset.id === activePreset.id
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-sm font-semibold">{preset.label}</div>
                  <div
                    className={`mt-0.5 text-xs ${
                      preset.id === activePreset.id ? "text-gray-200" : "text-gray-500"
                    }`}
                  >
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setInstanceVersion((value) => value + 1)
                setSelection(null)
              }}
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Reset Current Preset
            </button>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Selected output
              </div>
              <div className="mt-1 text-sm text-gray-800">{formatSelection(selection)}</div>
            </div>
          </aside>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <OklchPicker
              key={`${activePreset.id}:${instanceVersion}`}
              initialState={activePreset.initialState}
              onChange={setSelection}
            />
          </section>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Bridge Field (Floating Widget)</h3>
          <p className="mt-1 text-sm text-gray-600">
            This validates the app integration path used in Color Canvas inputs.
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              <ColorPickerField
                value={bridgeValue}
                onChange={setBridgeValue}
                placeholder="oklch(...) or color(display-p3 ...)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Current value
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-7 w-7 rounded-md border border-gray-300"
                  style={{ background: bridgeValue.trim() || "transparent" }}
                />
                <code className="text-xs text-gray-800">{bridgeValue || "—"}</code>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
