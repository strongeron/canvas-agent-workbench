/**
 * Thicket Example - Full Gallery Implementation
 *
 * This folder contains Thicket-specific implementations showing how to:
 * - Create a ComponentRenderer with your component library
 * - Configure gallery entries for all your components
 * - Build a complete gallery page with sidebar and filters
 *
 * Use this as a reference when integrating gallery-poc into your own project.
 */

// Thicket Component Renderers
export { ComponentRenderer } from "./renderers/ComponentRenderer"
export { LayoutRenderer } from "./renderers/LayoutRenderer"

// Thicket Preview Components
export { SonnerPreview } from "./previews/SonnerPreview"
export { EarlyAccessFormPreview } from "./previews/EarlyAccessFormPreview"

// Thicket Gallery Pages
export { default as GalleryPage } from "./GalleryPage"
export { GallerySidebar } from "./GallerySidebar"
export { TokenSection } from "./TokenSection"
export { SnapshotManager } from "./SnapshotManager"

// Re-export configs and mocks for reference
export * from "./mocks/componentVariants"
export * from "./mocks/designTokens"
export * from "./registry/types"
