import { useState } from "react";
import { OklchPicker } from "./OklchPicker";
import type { PickerChange } from "./types";

function formatLog(entry: PickerChange | null): string {
  if (!entry) return "No selection yet";
  return `${entry.css} • ${entry.hex} • Lc ${entry.lcAgainstBackground.toFixed(1)}`;
}

export function OklchPickerDemo() {
  const [primary, setPrimary] = useState<PickerChange | null>(null);
  const [accent, setAccent] = useState<PickerChange | null>(null);

  return (
    <div className="oklch-demo">
      <header className="oklch-demo__header">
        <h1>Portable OKLCH Picker Demo</h1>
        <p>
          Two independent picker instances. Use one for primary and one for accent,
          then inspect the generated theme swatches.
        </p>
      </header>

      <div className="oklch-demo__pickers">
        <div className="oklch-demo__picker-card">
          <h2>Primary picker</h2>
          <OklchPicker
            initialState={{
              plane: "HC_at_L",
              mode: "shape",
              gamut: "srgb",
              L: 0.62,
              C: 0.18,
              h: 250,
            }}
            onChange={setPrimary}
          />
        </div>

        <div className="oklch-demo__picker-card">
          <h2>Accent picker</h2>
          <OklchPicker
            initialState={{
              plane: "AH_at_C",
              mode: "apca",
              gamut: "p3",
              L: 0.58,
              C: 0.21,
              h: 320,
              apcaBg: { L: 0.12, C: 0.02, h: 260 },
              apcaTargets: [45, 60, 75],
            }}
            onChange={setAccent}
          />
        </div>
      </div>

      <section className="oklch-demo__theme">
        <h2>Theme preview</h2>
        <div className="oklch-demo__log-grid">
          <div className="oklch-demo__log">
            <strong>Primary</strong>
            <span>{formatLog(primary)}</span>
          </div>
          <div className="oklch-demo__log">
            <strong>Accent</strong>
            <span>{formatLog(accent)}</span>
          </div>
        </div>

        <div className="oklch-demo__chips">
          <div
            className="oklch-demo__chip"
            style={{
              background: primary?.css ?? "linear-gradient(120deg, #475569, #1e293b)",
              color: "#ffffff",
            }}
          >
            Primary action
          </div>
          <div
            className="oklch-demo__chip"
            style={{
              background: accent?.css ?? "linear-gradient(120deg, #6d28d9, #312e81)",
              color: "#ffffff",
            }}
          >
            Accent action
          </div>
          <div
            className="oklch-demo__chip oklch-demo__chip--outline"
            style={{
              borderColor: accent?.css ?? "#7c3aed",
              color: accent?.css ?? "#7c3aed",
            }}
          >
            Outline element
          </div>
        </div>
      </section>
    </div>
  );
}
