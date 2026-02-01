/**
 * PropControl - Individual control components for interactive props
 *
 * Renders the appropriate control based on PropSchema type.
 */

import { ChevronDown } from "lucide-react"

import type { PropSchema } from "../core/types"

interface PropControlProps {
  name: string
  schema: PropSchema
  value: any
  onChange: (value: any) => void
}

export function PropControl({ name, schema, value, onChange }: PropControlProps) {
  const label = schema.label || name

  switch (schema.type) {
    case "text":
      return (
        <TextControl
          label={label}
          value={value}
          onChange={onChange}
          placeholder={schema.placeholder}
        />
      )

    case "textarea":
      return (
        <TextareaControl
          label={label}
          value={value}
          onChange={onChange}
          placeholder={schema.placeholder}
        />
      )

    case "number":
      return (
        <NumberControl
          label={label}
          value={value}
          onChange={onChange}
          min={schema.min}
          max={schema.max}
          step={schema.step}
        />
      )

    case "boolean":
      return <BooleanControl label={label} value={value} onChange={onChange} />

    case "select":
      return (
        <SelectControl
          label={label}
          value={value}
          onChange={onChange}
          options={schema.options || []}
        />
      )

    case "radio":
      return (
        <RadioControl
          label={label}
          value={value}
          onChange={onChange}
          options={schema.options || []}
        />
      )

    case "json":
      return <JsonControl label={label} value={value} onChange={onChange} />

    default:
      return (
        <div className="text-xs text-muted">
          Unsupported control type: {schema.type}
        </div>
      )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Control Components
// ─────────────────────────────────────────────────────────────────────────────

interface TextControlProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function TextControl({ label, value, onChange, placeholder }: TextControlProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-default bg-white px-2.5 text-sm text-foreground placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
      />
    </div>
  )
}

interface TextareaControlProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function TextareaControl({
  label,
  value,
  onChange,
  placeholder,
}: TextareaControlProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-md border border-default bg-white px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
      />
    </div>
  )
}

interface NumberControlProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

function NumberControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: NumberControlProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-8 w-full rounded-md border border-default bg-white px-2.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
      />
    </div>
  )
}

interface BooleanControlProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

function BooleanControl({ label, value, onChange }: BooleanControlProps) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <label className="text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-1 ${
          value ? "bg-brand-600" : "bg-surface-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            value ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

interface SelectControlProps {
  label: string
  value: any
  onChange: (value: any) => void
  options: Array<{ value: any; label: string }>
}

function SelectControl({ label, value, onChange, options }: SelectControlProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full appearance-none rounded-md border border-default bg-white px-2.5 pr-8 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  )
}

interface RadioControlProps {
  label: string
  value: any
  onChange: (value: any) => void
  options: Array<{ value: any; label: string }>
}

function RadioControl({ label, value, onChange, options }: RadioControlProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-brand-600 text-white"
                : "bg-surface-100 text-muted-foreground hover:bg-surface-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface JsonControlProps {
  label: string
  value: any
  onChange: (value: any) => void
}

function JsonControl({ label, value, onChange }: JsonControlProps) {
  const stringValue = typeof value === "string" ? value : JSON.stringify(value, null, 2)

  const handleChange = (newValue: string) => {
    try {
      const parsed = JSON.parse(newValue)
      onChange(parsed)
    } catch {
      // Keep as string if not valid JSON
      onChange(newValue)
    }
  }

  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <textarea
        value={stringValue}
        onChange={(e) => handleChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-md border border-default bg-surface-50 px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
      />
    </div>
  )
}
