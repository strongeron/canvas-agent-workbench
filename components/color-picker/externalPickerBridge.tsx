import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { OklchPicker, type Oklch, type PickerState } from "../oklch-picker-portable/src"
import type { ColorPickerRenderer } from "./types"
import "../oklch-picker-portable/src/styles.css"
import "./externalPickerBridge.css"

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function wrapHue(value: number) {
  const mod = value % 360
  return mod < 0 ? mod + 360 : mod
}

function toOklchCss(color: Oklch) {
  return `oklch(${(color.L * 100).toFixed(1)}% ${color.C.toFixed(4)} ${color.h.toFixed(1)})`
}

function parsePercent(raw: string) {
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) return null
  if (raw.includes("%") || value > 1) return value / 100
  return value
}

function parseInitialState(value: string): Partial<PickerState> | undefined {
  const input = value.trim()
  if (!input) return undefined
  if (input.toLowerCase().startsWith("color(display-p3")) {
    return { gamut: "p3" }
  }

  const match = input.toLowerCase().match(/^oklch\(([^)]+)\)$/)
  if (!match) return undefined
  const [channelsPart] = match[1].split("/")
  const parts = channelsPart.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) return undefined

  const L = parsePercent(parts[0])
  const C = parsePercent(parts[1])
  const h = Number.parseFloat(parts[2])
  if (L === null || C === null || !Number.isFinite(h)) return undefined

  return {
    L: clamp(L, 0, 1),
    C: Math.max(0, C),
    h: wrapHue(h),
  }
}

function OklchPortableField({
  id,
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const initialState = useMemo(() => parseInitialState(value), [value])
  const swatchColor = value?.trim() ? value : "transparent"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const widget =
    mounted && open
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close color picker"
              className="gallery-oklch-overlay"
              onClick={() => setOpen(false)}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-label="OKLCH color picker"
              className="gallery-oklch-widget"
            >
              <header className="gallery-oklch-widget__header">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Color Picker</div>
                  <div className="truncate text-xs text-muted-foreground">{value || "No value selected"}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
                >
                  Close
                </button>
              </header>
              <div className="gallery-oklch-widget__body">
                <OklchPicker
                  key={value || "empty"}
                  className="gallery-oklch-picker"
                  initialState={initialState}
                  onChange={(next) => {
                    const css = next.gamut === "p3" ? next.css : toOklchCss(next.color)
                    onChange(css)
                  }}
                />
              </div>
            </section>
          </>,
          document.body
        )
      : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-8 w-8 shrink-0 rounded-md border border-default"
          style={{ background: swatchColor }}
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="shrink-0 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {open ? "Close" : "Pick"}
        </button>
      </div>
      {widget}
    </div>
  )
}

export const externalColorPickerRenderer: ColorPickerRenderer = (props) => (
  <OklchPortableField {...props} />
)
