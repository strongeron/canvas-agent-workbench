/**
 * CanvasPropsPanel - Right sidebar panel for editing component props in canvas mode
 *
 * Features:
 * - Shows interactive schema controls when available
 * - Falls back to JSON editor for components without schema
 * - Variant switching dropdown to change component variant
 * - Copy props as JSX code
 * - Reset to defaults
 */

import { ChevronDown, Code2, Copy, Layers, RotateCcw, X } from "lucide-react"
import { useState, useCallback, useMemo } from "react"

import type { InteractivePropsSchema, ComponentVariant } from "../../core/types"
import { PropControl } from "../PropControl"

/** Minimal component info needed for the props panel */
interface ComponentInfo {
  name: string
  variants: ComponentVariant[]
}

interface CanvasPropsPanelProps {
  componentName: string
  variantName: string
  variantIndex: number
  component: ComponentInfo
  schema: InteractivePropsSchema | null
  values: Record<string, unknown>
  onChange: (propName: string, value: unknown) => void
  onReset: () => void
  onClose: () => void
  onVariantChange: (variantIndex: number) => void
}

export function CanvasPropsPanel({
  componentName,
  variantName,
  variantIndex,
  component,
  schema,
  values,
  onChange,
  onReset,
  onClose,
  onVariantChange,
}: CanvasPropsPanelProps) {
  const [copied, setCopied] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [jsonEditMode, setJsonEditMode] = useState(false)
  const [jsonValue, setJsonValue] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)

  const hasSchema = schema && Object.keys(schema).length > 0
  const schemaEntries = hasSchema ? Object.entries(schema) : []

  // Get all variants for the dropdown
  const variants = useMemo(() => {
    return component.variants.map((v, idx) => ({
      index: idx,
      name: v.name,
      description: v.description,
    }))
  }, [component.variants])

  const handleCopyProps = useCallback(async () => {
    const propsCode = generatePropsCode(values)
    await navigator.clipboard.writeText(propsCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [values])

  const handleJsonEdit = useCallback(() => {
    setJsonValue(JSON.stringify(values, null, 2))
    setJsonEditMode(true)
    setJsonError(null)
  }, [values])

  const handleJsonSave = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonValue)
      // Apply all props from JSON
      Object.entries(parsed).forEach(([key, value]) => {
        onChange(key, value)
      })
      setJsonEditMode(false)
      setJsonError(null)
    } catch (e) {
      setJsonError("Invalid JSON")
    }
  }, [jsonValue, onChange])

  const handleJsonCancel = useCallback(() => {
    setJsonEditMode(false)
    setJsonError(null)
  }, [])

  // Handle individual prop change for JSON-only mode
  const handleJsonPropChange = useCallback(
    (newValue: string) => {
      setJsonValue(newValue)
      setJsonError(null)
    },
    []
  )

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{componentName}</h3>
          <p className="truncate text-xs text-muted-foreground">{variantName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Variant Selector */}
      <div className="border-b border-default px-4 py-3">
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
          <Layers className="mr-1 inline h-3 w-3" />
          Variant
        </label>
        <div className="relative">
          <select
            value={variantIndex}
            onChange={(e) => onVariantChange(Number(e.target.value))}
            className="h-8 w-full appearance-none rounded-md border border-default bg-white px-2.5 pr-8 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          >
            {variants.map((v) => (
              <option key={v.index} value={v.index}>
                {v.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
        {variants[variantIndex]?.description && (
          <p className="mt-1.5 text-[10px] leading-tight text-muted">
            {variants[variantIndex].description}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-default px-4 py-2">
        <button
          type="button"
          onClick={handleCopyProps}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-surface-100 hover:text-foreground"
          title="Copy props as JSX"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-surface-100 hover:text-foreground"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
        {!hasSchema && (
          <button
            type="button"
            onClick={jsonEditMode ? handleJsonCancel : handleJsonEdit}
            className={`ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs ${
              jsonEditMode
                ? "bg-brand-100 text-brand-700"
                : "text-muted-foreground hover:bg-surface-100 hover:text-foreground"
            }`}
            title="Edit as JSON"
          >
            <Code2 className="h-3.5 w-3.5" />
            {jsonEditMode ? "Cancel" : "Edit JSON"}
          </button>
        )}
      </div>

      {/* Props Controls */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {hasSchema ? (
          // Interactive schema controls
          <div className="space-y-4">
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
        ) : jsonEditMode ? (
          // JSON edit mode
          <div className="space-y-3">
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Edit props as JSON. Click Save to apply changes.
            </div>
            <textarea
              value={jsonValue}
              onChange={(e) => handleJsonPropChange(e.target.value)}
              rows={12}
              className={`w-full resize-none rounded-md border bg-surface-50 px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 ${
                jsonError
                  ? "border-red-300 focus:border-red-300 focus:ring-red-300"
                  : "border-default focus:border-brand-300 focus:ring-brand-300"
              }`}
              spellCheck={false}
            />
            {jsonError && <p className="text-xs text-red-600">{jsonError}</p>}
            <button
              type="button"
              onClick={handleJsonSave}
              className="w-full rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              Save Changes
            </button>
          </div>
        ) : (
          // JSON read-only view for components without schema
          <div className="space-y-3">
            <div className="rounded-md bg-surface-100 px-3 py-2 text-xs text-muted-foreground">
              No interactive schema defined. Use JSON editor to modify props.
            </div>
            <pre className="overflow-x-auto rounded-md bg-surface-50 p-3 text-[11px] text-foreground">
              {JSON.stringify(values, null, 2)}
            </pre>
          </div>
        )}

        {/* JSON Preview (for schema mode) */}
        {hasSchema && (
          <div className="mt-6 border-t border-default pt-4">
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Code2 className="h-3 w-3" />
              {showJson ? "Hide" : "Show"} JSON
            </button>

            {showJson && (
              <pre className="mt-2 overflow-x-auto rounded-md bg-surface-100 p-3 text-[11px] text-foreground">
                {JSON.stringify(values, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Footer with prop count */}
      <div className="border-t border-default px-4 py-2">
        <p className="text-[11px] text-muted">
          {hasSchema ? (
            <>
              {schemaEntries.length} interactive{" "}
              {schemaEntries.length === 1 ? "prop" : "props"}
            </>
          ) : (
            <>
              {Object.keys(values).length} {Object.keys(values).length === 1 ? "prop" : "props"} (JSON
              mode)
            </>
          )}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Generate Props Code
// ─────────────────────────────────────────────────────────────────────────────

function generatePropsCode(values: Record<string, unknown>): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue

    if (typeof value === "string") {
      lines.push(`${key}="${value}"`)
    } else if (typeof value === "boolean") {
      if (value) {
        lines.push(key)
      }
    } else if (typeof value === "number") {
      lines.push(`${key}={${value}}`)
    } else if (typeof value === "object") {
      lines.push(`${key}={${JSON.stringify(value)}}`)
    }
  }

  return lines.join("\n")
}
