/**
 * Gallery POC - Interactive Props Schema Helpers
 *
 * Pre-built schemas for common component prop patterns.
 * Reduces boilerplate when defining interactive variants.
 */

import type { InteractivePropsSchema, PropSchema } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Common Option Sets
// ─────────────────────────────────────────────────────────────────────────────

export const SIZE_OPTIONS = [
  { value: "xs", label: "Extra Small" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" },
]

export const BOOLEAN_OPTIONS = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Common Prop Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const childrenSchema: PropSchema = {
  type: "text",
  label: "Children",
  placeholder: "Button text or content",
  description: "The content to display inside the component",
}

export const disabledSchema: PropSchema = {
  type: "boolean",
  label: "Disabled",
  defaultValue: false,
  description: "Whether the component is disabled",
}

export const loadingSchema: PropSchema = {
  type: "boolean",
  label: "Loading",
  defaultValue: false,
  description: "Whether the component is in a loading state",
}

export const fullWidthSchema: PropSchema = {
  type: "boolean",
  label: "Full Width",
  defaultValue: false,
  description: "Whether the component should span full width",
}

export const placeholderSchema: PropSchema = {
  type: "text",
  label: "Placeholder",
  placeholder: "Enter placeholder text...",
  description: "Placeholder text shown when empty",
}

export const labelSchema: PropSchema = {
  type: "text",
  label: "Label",
  placeholder: "Field label",
  description: "Label text for the field",
}

export const errorSchema: PropSchema = {
  type: "text",
  label: "Error Message",
  placeholder: "Error text...",
  optional: true,
  description: "Error message to display",
}

// ─────────────────────────────────────────────────────────────────────────────
// Component-Specific Schema Builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a schema for Button-like components
 */
export function buttonSchema(
  variants: Array<{ value: string; label: string }> = [
    { value: "brand", label: "Brand" },
    { value: "secondary", label: "Secondary" },
    { value: "outline", label: "Outline" },
    { value: "ghost", label: "Ghost" },
    { value: "destructive", label: "Destructive" },
  ]
): InteractivePropsSchema {
  return {
    children: childrenSchema,
    variant: {
      type: "select",
      label: "Variant",
      options: variants,
      description: "Visual style variant",
    },
    size: {
      type: "radio",
      label: "Size",
      options: [
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
      ],
      description: "Button size",
    },
    disabled: disabledSchema,
    isLoading: loadingSchema,
    fullWidth: fullWidthSchema,
  }
}

/**
 * Create a schema for Input-like components
 */
export function inputSchema(): InteractivePropsSchema {
  return {
    value: {
      type: "text",
      label: "Value",
      placeholder: "Enter value...",
      description: "Current input value",
    },
    label: labelSchema,
    placeholder: placeholderSchema,
    error: errorSchema,
    disabled: disabledSchema,
  }
}

/**
 * Create a schema for TextArea components
 */
export function textareaSchema(): InteractivePropsSchema {
  return {
    value: {
      type: "textarea",
      label: "Value",
      placeholder: "Enter text...",
      description: "Current textarea value",
    },
    label: labelSchema,
    placeholder: placeholderSchema,
    rows: {
      type: "number",
      label: "Rows",
      min: 2,
      max: 20,
      defaultValue: 4,
      description: "Number of visible rows",
    },
    error: errorSchema,
    disabled: disabledSchema,
  }
}

/**
 * Create a schema for Select components
 */
export function selectSchema(): InteractivePropsSchema {
  return {
    label: labelSchema,
    placeholder: {
      ...placeholderSchema,
      defaultValue: "Select an option...",
    },
    error: errorSchema,
    disabled: disabledSchema,
  }
}

/**
 * Create a schema for Badge-like components
 */
export function badgeSchema(
  variants: Array<{ value: string; label: string }> = [
    { value: "default", label: "Default" },
    { value: "success", label: "Success" },
    { value: "warning", label: "Warning" },
    { value: "error", label: "Error" },
    { value: "info", label: "Info" },
  ]
): InteractivePropsSchema {
  return {
    children: {
      ...childrenSchema,
      placeholder: "Badge text",
    },
    variant: {
      type: "select",
      label: "Variant",
      options: variants,
      description: "Color variant",
    },
    size: {
      type: "radio",
      label: "Size",
      options: [
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
      ],
      description: "Badge size",
    },
  }
}

/**
 * Create a schema for Card-like components
 */
export function cardSchema(): InteractivePropsSchema {
  return {
    title: {
      type: "text",
      label: "Title",
      placeholder: "Card title",
      description: "Card heading",
    },
    description: {
      type: "textarea",
      label: "Description",
      placeholder: "Card description...",
      description: "Card body text",
    },
  }
}

/**
 * Create a schema for Modal-like components
 */
export function modalSchema(): InteractivePropsSchema {
  return {
    title: {
      type: "text",
      label: "Title",
      placeholder: "Modal title",
      description: "Modal heading",
    },
    isOpen: {
      type: "boolean",
      label: "Open",
      defaultValue: true,
      description: "Whether the modal is open",
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Composition Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge multiple schemas into one
 */
export function mergeSchemas(...schemas: InteractivePropsSchema[]): InteractivePropsSchema {
  return Object.assign({}, ...schemas)
}

/**
 * Pick specific props from a schema
 */
export function pickSchema(
  schema: InteractivePropsSchema,
  keys: string[]
): InteractivePropsSchema {
  const result: InteractivePropsSchema = {}
  for (const key of keys) {
    if (schema[key]) {
      result[key] = schema[key]
    }
  }
  return result
}

/**
 * Omit specific props from a schema
 */
export function omitSchema(
  schema: InteractivePropsSchema,
  keys: string[]
): InteractivePropsSchema {
  const result: InteractivePropsSchema = { ...schema }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

/**
 * Extend a schema with additional props
 */
export function extendSchema(
  base: InteractivePropsSchema,
  extensions: InteractivePropsSchema
): InteractivePropsSchema {
  return {
    ...base,
    ...extensions,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built Schema Collection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collection of common prop schemas for quick access
 */
export const propSchemas = {
  buttonSchema,
  inputSchema,
  textareaSchema,
  selectSchema,
  badgeSchema,
  cardSchema,
  modalSchema,

  // Common individual props
  children: childrenSchema,
  disabled: disabledSchema,
  loading: loadingSchema,
  fullWidth: fullWidthSchema,
  placeholder: placeholderSchema,
  label: labelSchema,
  error: errorSchema,
}
