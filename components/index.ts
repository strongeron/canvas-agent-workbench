/**
 * Component Gallery System - Components Module
 *
 * Portable gallery components for the design playground.
 * Reference examples are in examples/_reference-thicket/
 */

// Core Portable Components
export { PortableComponentRenderer } from "./PortableComponentRenderer"
export type { PortableComponentRendererProps, RenderMode, BackgroundColor } from "./PortableComponentRenderer"

export { PortableGalleryPage } from "./PortableGalleryPage"
export type { default as PortableGalleryPageProps } from "./PortableGalleryPage"

// Portable UI Components
export { InteractivePropsPanel } from "./InteractivePropsPanel"
export { PropControl } from "./PropControl"
export { ModalPreview } from "./ModalPreview"
export { GalleryHeader } from "./GalleryHeader"
export { ComponentSection } from "./ComponentSection"
export { LayoutSection } from "./LayoutSection"

// Canvas Components (Portable with Props Injection)
export { CanvasTab } from "./canvas/CanvasTab"
export type { PaperImportContext, PaperImportResult, PaperImportQueueItem } from "./canvas/CanvasTab"
export { CanvasWorkspace } from "./canvas/CanvasWorkspace"
export { CanvasToolbar } from "./canvas/CanvasToolbar"
export { CanvasSidebar } from "./canvas/CanvasSidebar"
export { CanvasPropsPanel } from "./canvas/CanvasPropsPanel"
export { CanvasItem } from "./canvas/CanvasItem"
export { CanvasScenesPanel } from "./canvas/CanvasScenesPanel"
export { CanvasContextMenu } from "./canvas/CanvasContextMenu"
export { CanvasHelpOverlay } from "./canvas/CanvasHelpOverlay"

// Color picker module (package-style local adapter)
export { ColorPickerField } from "./color-picker"
export { ColorPickerProvider } from "./color-picker"
export { externalColorPickerRenderer } from "./color-picker"
export type { ColorPickerRenderProps, ColorPickerRenderer } from "./color-picker"
