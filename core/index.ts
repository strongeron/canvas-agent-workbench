/**
 * Gallery POC - Core Module
 *
 * Re-exports all core types, utilities, and helpers.
 */

// Types
export * from "./types"

// Adapter
export { createStaticAdapter, createDynamicAdapter } from "./adapter"
export type { GalleryAdapter, StaticAdapterConfig, DynamicAdapterConfig } from "./adapter"

// Context (React)
export { GalleryProvider, useGalleryAdapter, useGalleryAdapterOptional } from "./GalleryContext"
export type { GalleryProviderProps } from "./GalleryContext"

// Render Config
export {
  DEFAULT_RENDER_CONFIG,
  createRenderConfig,
  getComponentRenderBehavior,
  isOverlayComponent,
  isFullWidthComponent,
  isDropdownComponent,
  isCoverComponent,
  isToastComponent,
} from "./render-config"

// Schema Helpers
export {
  propSchemas,
  buttonSchema,
  inputSchema,
  textareaSchema,
  selectSchema,
  badgeSchema,
  cardSchema,
  modalSchema,
  mergeSchemas,
  pickSchema,
  omitSchema,
  extendSchema,
  SIZE_OPTIONS,
  BOOLEAN_OPTIONS,
} from "./schema-helpers"

// MCP Bridges
export * from "./mcp/paper"
