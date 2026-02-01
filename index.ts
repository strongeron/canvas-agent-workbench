/**
 * Component Gallery System
 *
 * A portable component gallery and canvas-based design playground.
 *
 * @example
 * ```tsx
 * import { createStaticAdapter, propSchemas } from 'component-gallery-system'
 * import type { GalleryEntry } from 'component-gallery-system'
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
 *     props: { variant: 'primary', children: 'Click' },
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
