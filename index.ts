/**
 * Gallery POC
 *
 * A portable component gallery and canvas-based design playground.
 * Extracted from Thicket marketplace-courses.
 *
 * @example
 * ```tsx
 * import { createStaticAdapter, propSchemas } from './gallery-poc'
 * import type { GalleryEntry } from './gallery-poc'
 *
 * // Define your component
 * const buttonEntry: GalleryEntry = {
 *   id: 'ui/button',
 *   name: 'Button',
 *   category: 'Base UI',
 *   importPath: '@/components/ui/button',
 *   variants: [{
 *     name: 'Primary',
 *     description: 'Main CTA',
 *     props: { variant: 'brand', children: 'Click' },
 *     status: 'prod',
 *     category: 'variant',
 *     interactiveSchema: propSchemas.buttonSchema(),
 *   }]
 * }
 *
 * // Create adapter
 * const adapter = createStaticAdapter({
 *   componentMap: { Button },
 *   entries: [buttonEntry],
 * })
 * ```
 */

// Core exports
export * from "./core"

// Type exports (canvas types for canvas mode)
export * from "./types/canvas"

// Hooks exports
export * from "./hooks"

// Component exports
export * from "./components"

// Utility exports
export * from "./utils/filterVariants"
