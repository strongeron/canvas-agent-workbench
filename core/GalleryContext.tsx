/**
 * Gallery POC - Gallery Context
 *
 * React context for providing the gallery adapter to all gallery components.
 * This decouples the gallery UI from the specific component implementations.
 */

import { createContext, useContext, type ReactNode } from "react"
import type { GalleryAdapter } from "./adapter"

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const GalleryAdapterContext = createContext<GalleryAdapter | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface GalleryProviderProps {
  adapter: GalleryAdapter
  children: ReactNode
}

export function GalleryProvider({ adapter, children }: GalleryProviderProps) {
  return (
    <GalleryAdapterContext.Provider value={adapter}>
      {children}
    </GalleryAdapterContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useGalleryAdapter(): GalleryAdapter {
  const adapter = useContext(GalleryAdapterContext)

  if (!adapter) {
    throw new Error(
      "useGalleryAdapter must be used within a GalleryProvider. " +
        "Wrap your gallery components with <GalleryProvider adapter={...}>."
    )
  }

  return adapter
}

// ─────────────────────────────────────────────────────────────────────────────
// Optional hook (returns null if no provider)
// ─────────────────────────────────────────────────────────────────────────────

export function useGalleryAdapterOptional(): GalleryAdapter | null {
  return useContext(GalleryAdapterContext)
}
