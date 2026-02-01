/**
 * InteractivePropsPanel - Control panel for editing component props live
 *
 * Displays a collapsible panel with controls for each prop defined in the schema.
 * Changes are reflected in real-time in the component preview.
 */

import { ChevronDown, ChevronRight, Copy, RotateCcw } from "lucide-react"
import { useState } from "react"

import type { InteractivePropsSchema } from "../core/types"
import { PropControl } from "./PropControl"

interface InteractivePropsPanelProps {
  schema: InteractivePropsSchema
  values: Record<string, any>
  onChange: (propName: string, value: any) => void
  onReset: () => void
  compact?: boolean
}

export function InteractivePropsPanel({
  schema,
  values,
  onChange,
  onReset,
  compact = false,
}: InteractivePropsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)

  const schemaEntries = Object.entries(schema)

  const handleCopyProps = () => {
    const propsCode = generatePropsCode(values)
    void navigator.clipboard.writeText(propsCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (compact) {
    return (
      <CompactPanel
        schema={schema}
        values={values}
        onChange={onChange}
        onReset={onReset}
      />
    )
  }

  return (
    <div className="border-t border-default bg-surface-50">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-4 py-2 hover:bg-surface-100">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted" />
          )}
          <span className="text-xs font-semibold text-foreground">
            Props
          </span>
          <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
            {schemaEntries.length}
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyProps}
            className="rounded p-1 text-muted-foreground hover:bg-surface-200 hover:text-foreground"
            title="Copy props as code"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded p-1 text-muted-foreground hover:bg-surface-200 hover:text-foreground"
            title="Reset to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Copy feedback */}
      {copied && (
        <div className="bg-brand-50 px-4 py-1 text-xs text-brand-700">
          Props copied to clipboard!
        </div>
      )}

      {/* Controls */}
      {isExpanded && (
        <div className="space-y-3 px-4 pb-4">
          {schemaEntries.map(([propName, propSchema]) => (
            <PropControl
              key={propName}
              name={propName}
              schema={propSchema}
              value={values[propName]}
              onChange={(value) => onChange(propName, value)}
            />
          ))}

          {/* JSON Preview Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              {showJson ? "Hide" : "Show"} JSON
            </button>

            {showJson && (
              <pre className="mt-2 overflow-x-auto rounded-md bg-surface-100 p-2 text-[10px] text-foreground">
                {JSON.stringify(values, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Panel (for Canvas mode)
// ─────────────────────────────────────────────────────────────────────────────

interface CompactPanelProps {
  schema: InteractivePropsSchema
  values: Record<string, any>
  onChange: (propName: string, value: any) => void
  onReset: () => void
}

function CompactPanel({ schema, values, onChange, onReset }: CompactPanelProps) {
  const schemaEntries = Object.entries(schema)

  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-default bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground">Props</span>
        <button
          type="button"
          onClick={onReset}
          className="rounded p-0.5 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
          title="Reset"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2">
        {schemaEntries.map(([propName, propSchema]) => (
          <PropControl
            key={propName}
            name={propName}
            schema={propSchema}
            value={values[propName]}
            onChange={(value) => onChange(propName, value)}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Generate Props Code
// ─────────────────────────────────────────────────────────────────────────────

function generatePropsCode(values: Record<string, any>): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue

    if (typeof value === "string") {
      lines.push(`  ${key}="${value}"`)
    } else if (typeof value === "boolean") {
      if (value) {
        lines.push(`  ${key}`)
      }
    } else if (typeof value === "number") {
      lines.push(`  ${key}={${value}}`)
    } else if (typeof value === "object") {
      lines.push(`  ${key}={${JSON.stringify(value)}}`)
    }
  }

  return lines.join("\n")
}
