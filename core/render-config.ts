/**
 * Gallery POC - Component Rendering Configuration
 *
 * Defines how different types of components should be rendered in the gallery.
 * Centralizes rendering behavior that was previously scattered as hardcoded arrays.
 */

import type { ComponentRenderBehavior } from "./types"

/**
 * Default rendering behavior configuration.
 * Override or extend this for your project.
 */
export const DEFAULT_RENDER_CONFIG: Record<string, ComponentRenderBehavior> = {
  // Common overlay components
  Modal: "overlay",
  Dialog: "overlay",
  ConfirmationModal: "overlay",
  AlertDialog: "overlay",

  // Common dropdown components
  Select: "dropdown",
  Dropdown: "dropdown",
  DropdownMenu: "dropdown",
  Autocomplete: "dropdown",
  Combobox: "dropdown",
  DatePicker: "dropdown",
  TimePicker: "dropdown",

  // Common full-width components
  Table: "fullWidth",
  DataTable: "fullWidth",
  EmptyState: "fullWidth",
}

/**
 * Create a render config by merging defaults with project-specific overrides
 */
export function createRenderConfig(
  overrides: Record<string, ComponentRenderBehavior> = {}
): Record<string, ComponentRenderBehavior> {
  return {
    ...DEFAULT_RENDER_CONFIG,
    ...overrides,
  }
}

/**
 * Get rendering behavior for a component
 */
export function getComponentRenderBehavior(
  componentName: string,
  config: Record<string, ComponentRenderBehavior> = DEFAULT_RENDER_CONFIG
): ComponentRenderBehavior {
  return config[componentName] ?? "default"
}

/**
 * Helper to check if component is overlay
 */
export function isOverlayComponent(
  componentName: string,
  config: Record<string, ComponentRenderBehavior> = DEFAULT_RENDER_CONFIG
): boolean {
  return getComponentRenderBehavior(componentName, config) === "overlay"
}

/**
 * Helper to check if component is full width
 */
export function isFullWidthComponent(
  componentName: string,
  config: Record<string, ComponentRenderBehavior> = DEFAULT_RENDER_CONFIG
): boolean {
  return getComponentRenderBehavior(componentName, config) === "fullWidth"
}

/**
 * Helper to check if component is dropdown
 */
export function isDropdownComponent(
  componentName: string,
  config: Record<string, ComponentRenderBehavior> = DEFAULT_RENDER_CONFIG
): boolean {
  return getComponentRenderBehavior(componentName, config) === "dropdown"
}

/**
 * Helper to check if component needs cover wrapper
 */
export function isCoverComponent(
  componentName: string,
  config: Record<string, ComponentRenderBehavior> = DEFAULT_RENDER_CONFIG
): boolean {
  return getComponentRenderBehavior(componentName, config) === "cover"
}

/**
 * Helper to check if component is toast preview
 */
export function isToastComponent(
  componentName: string,
  config: Record<string, ComponentRenderBehavior> = DEFAULT_RENDER_CONFIG
): boolean {
  return getComponentRenderBehavior(componentName, config) === "toast"
}
