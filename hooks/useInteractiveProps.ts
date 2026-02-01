/**
 * useInteractiveProps - Hook for managing interactive prop state
 *
 * Handles state management for component props that can be edited live.
 * Supports resetting to defaults and tracks which props have been modified.
 */

import { useCallback, useMemo, useState } from "react"

import type { InteractivePropsSchema } from "../core/types"

interface UseInteractivePropsOptions {
  /** Initial/default props from the variant */
  defaultProps: Record<string, any>
  /** Schema defining which props are editable */
  schema?: InteractivePropsSchema
}

interface UseInteractivePropsReturn {
  /** Current prop values (merged with defaults) */
  props: Record<string, any>
  /** Update a single prop value */
  setProp: (name: string, value: any) => void
  /** Update multiple props at once */
  setProps: (updates: Record<string, any>) => void
  /** Reset all props to defaults */
  reset: () => void
  /** Reset a specific prop to default */
  resetProp: (name: string) => void
  /** Check if any props have been modified */
  isModified: boolean
  /** Check if a specific prop has been modified */
  isPropModified: (name: string) => boolean
  /** Get only the modified props */
  modifiedProps: Record<string, any>
}

export function useInteractiveProps({
  defaultProps,
  schema,
}: UseInteractivePropsOptions): UseInteractivePropsReturn {
  // Track overrides separately from defaults
  const [overrides, setOverrides] = useState<Record<string, any>>({})

  // Merge defaults with schema defaults and current overrides
  const props = useMemo(() => {
    const schemaDefaults: Record<string, any> = {}

    if (schema) {
      for (const [key, propSchema] of Object.entries(schema)) {
        if (propSchema.defaultValue !== undefined) {
          schemaDefaults[key] = propSchema.defaultValue
        }
      }
    }

    return {
      ...schemaDefaults,
      ...defaultProps,
      ...overrides,
    }
  }, [defaultProps, schema, overrides])

  // Set a single prop
  const setProp = useCallback((name: string, value: any) => {
    setOverrides((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, [])

  // Set multiple props
  const setProps = useCallback((updates: Record<string, any>) => {
    setOverrides((prev) => ({
      ...prev,
      ...updates,
    }))
  }, [])

  // Reset all props
  const reset = useCallback(() => {
    setOverrides({})
  }, [])

  // Reset a specific prop
  const resetProp = useCallback((name: string) => {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  // Check if any props modified
  const isModified = Object.keys(overrides).length > 0

  // Check if specific prop modified
  const isPropModified = useCallback(
    (name: string) => name in overrides,
    [overrides]
  )

  // Get only modified props
  const modifiedProps = overrides

  return {
    props,
    setProp,
    setProps,
    reset,
    resetProp,
    isModified,
    isPropModified,
    modifiedProps,
  }
}
