/**
 * Schema Helpers for Interactive Gallery Props
 *
 * Provides convenient factory functions for creating PropSchema definitions.
 * Use these helpers to define interactive controls for gallery components.
 */

import type { PropSchema, InteractivePropsSchema } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Basic Prop Schema Factories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a text input schema
 */
export function text(label: string, placeholder?: string): PropSchema {
  return {
    type: "text",
    label,
    placeholder,
  }
}

/**
 * Create a textarea schema
 */
export function textarea(label: string, placeholder?: string): PropSchema {
  return {
    type: "textarea",
    label,
    placeholder,
  }
}

/**
 * Create a boolean toggle schema
 */
export function boolean(label: string, defaultValue = false): PropSchema {
  return {
    type: "boolean",
    label,
    defaultValue,
  }
}

/**
 * Create a select dropdown schema
 */
export function select<T extends string>(
  label: string,
  options: T[] | Array<{ value: T; label: string }>,
  defaultValue?: T
): PropSchema {
  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  )
  return {
    type: "select",
    label,
    options: normalizedOptions,
    defaultValue,
  }
}

/**
 * Create a radio button group schema
 */
export function radio<T extends string>(
  label: string,
  options: T[] | Array<{ value: T; label: string }>,
  defaultValue?: T
): PropSchema {
  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  )
  return {
    type: "radio",
    label,
    options: normalizedOptions,
    defaultValue,
  }
}

/**
 * Create a number input schema
 */
export function number(
  label: string,
  options?: { min?: number; max?: number; step?: number; defaultValue?: number }
): PropSchema {
  return {
    type: "number",
    label,
    min: options?.min,
    max: options?.max,
    step: options?.step ?? 1,
    defaultValue: options?.defaultValue,
  }
}

/**
 * Create a color picker schema (for design tokens)
 */
export function color(label: string, defaultValue?: string): PropSchema {
  return {
    type: "color",
    label,
    defaultValue,
  }
}

/**
 * Create an icon picker schema
 */
export function icon(label: string, defaultValue?: string): PropSchema {
  return {
    type: "icon",
    label,
    defaultValue,
  }
}

/**
 * Create a JSON editor schema for complex objects
 */
export function json(label: string, defaultValue?: any): PropSchema {
  return {
    type: "json",
    label,
    defaultValue,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component-Specific Schema Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Real button variants from button.tsx
 */
const BUTTON_VARIANTS = [
  "brand",
  "primary",
  "secondary",
  "waitlist",
  "waitlist-soft",
  "enrolled",
  "outline",
  "ghost",
  "cta",
  "warning",
] as const
const BUTTON_SIZES = ["sm", "md", "lg"] as const
const BUTTON_ROUNDED = ["full", "lg", "xl"] as const

/**
 * Schema for Button component - complete props from button.tsx
 */
export function buttonSchema(): InteractivePropsSchema {
  return {
    children: text("Button Text", "Click me"),
    variant: select("Variant", [...BUTTON_VARIANTS], "brand"),
    size: select("Size", [...BUTTON_SIZES], "md"),
    rounded: select("Rounded", [...BUTTON_ROUNDED], "full"),
    disabled: boolean("Disabled"),
    isLoading: boolean("Loading"),
    fullWidth: boolean("Full Width"),
  }
}

/**
 * Schema for Input component - complete props from input.tsx
 */
export function inputSchema(): InteractivePropsSchema {
  return {
    value: text("Value", "Type something..."),
    label: text("Label", "Field Label"),
    placeholder: text("Placeholder", "Enter value..."),
    error: text("Error Message"),
    success: text("Success Message"),
    warning: text("Warning Message"),
    disabled: boolean("Disabled"),
    hideLabel: boolean("Hide Label"),
  }
}

/**
 * Schema for Textarea component - complete props from textarea.tsx
 */
export function textareaSchema(): InteractivePropsSchema {
  return {
    value: text("Value", "Type something..."),
    label: text("Label", "Field Label"),
    placeholder: text("Placeholder", "Enter text..."),
    helperText: text("Helper Text"),
    error: text("Error Message"),
    success: text("Success Message"),
    warning: text("Warning Message"),
    disabled: boolean("Disabled"),
    rows: number("Rows", { min: 1, max: 20, defaultValue: 4 }),
  }
}

/**
 * Schema for Select component - complete props from select.tsx
 */
export function selectSchema(): InteractivePropsSchema {
  return {
    label: text("Label", "Select an option"),
    placeholder: text("Placeholder", "Select..."),
    error: text("Error Message"),
    success: text("Success Message"),
    warning: text("Warning Message"),
    disabled: boolean("Disabled"),
    hideLabel: boolean("Hide Label"),
  }
}

/**
 * Real badge variants from badge.tsx
 */
const BADGE_VARIANTS = [
  "default",
  "brand",
  "brand-filled",
  "brand-outline",
  "filled",
  "primary",
  "secondary",
  "success",
  "info",
  "warning",
  "neutral",
] as const
const BADGE_SIZES = ["xs", "sm", "md", "lg"] as const

/**
 * Schema for Badge component - complete props from badge.tsx
 */
export function badgeSchema(): InteractivePropsSchema {
  return {
    children: text("Badge Text", "Badge"),
    variant: select("Variant", [...BADGE_VARIANTS], "default"),
    size: select("Size", [...BADGE_SIZES], "md"),
  }
}

/**
 * Schema for SearchInput component
 */
export function searchInputSchema(): InteractivePropsSchema {
  return {
    value: text("Search Query", "Search..."),
    placeholder: text("Placeholder", "Search..."),
    isLoading: boolean("Loading"),
    disabled: boolean("Disabled"),
  }
}

/**
 * Schema for EmptyState component
 */
export function emptyStateSchema(): InteractivePropsSchema {
  return {
    title: text("Title", "No items found"),
    description: text("Description", "Try adjusting your search or filters"),
  }
}

/**
 * Schema for Tooltip component
 */
export function tooltipSchema(): InteractivePropsSchema {
  return {
    content: text("Tooltip Content", "Helpful tooltip text"),
    side: select("Position", ["top", "right", "bottom", "left"], "top"),
  }
}

/**
 * Schema for Accordion component
 */
export function accordionSchema(): InteractivePropsSchema {
  return {
    type: select("Type", ["single", "multiple"], "single"),
    defaultValue: text("Default Open Item"),
  }
}

/**
 * Schema for DatePicker component
 */
export function datePickerSchema(): InteractivePropsSchema {
  return {
    label: text("Label", "Select Date"),
    placeholder: text("Placeholder", "Pick a date..."),
    disabled: boolean("Disabled"),
  }
}

/**
 * Schema for TimePicker component
 */
export function timePickerSchema(): InteractivePropsSchema {
  return {
    label: text("Label", "Select Time"),
    placeholder: text("Placeholder", "Pick a time..."),
    disabled: boolean("Disabled"),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export all helpers as namespace for convenience
// ─────────────────────────────────────────────────────────────────────────────

export const propSchemas = {
  // Basic types
  text,
  textarea,
  boolean,
  select,
  radio,
  number,
  color,
  icon,
  json,

  // Component presets
  buttonSchema,
  inputSchema,
  textareaSchema,
  selectSchema,
  badgeSchema,
  searchInputSchema,
  emptyStateSchema,
  tooltipSchema,
  accordionSchema,
  datePickerSchema,
  timePickerSchema,
}
