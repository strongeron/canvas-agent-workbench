import { useEffect, useCallback } from "react"

interface CanvasShortcutsConfig {
  onToggleSidebar: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onFitToView: () => void
  onDelete: () => void
  onEscape: () => void
  onToggleHelp: () => void
  onSelectAll: () => void
  onDuplicate: () => void
  onGroup: () => void
  onUngroup: () => void
  onToggleScenes: () => void
  enabled?: boolean
}

/**
 * Keyboard shortcuts for the canvas devtool experience
 *
 * Shortcuts:
 * - [ or ] : Toggle sidebar
 * - + or = : Zoom in
 * - - : Zoom out
 * - 0 : Reset zoom to 100%
 * - 1 : Fit all items in view
 * - Delete/Backspace : Delete selected item
 * - Escape : Deselect / close panels
 * - ? : Toggle help overlay
 * - Cmd/Ctrl + A : Select all
 * - Cmd/Ctrl + D : Duplicate selected
 * - Cmd/Ctrl + G : Group selected
 * - Cmd/Ctrl + Shift + G : Ungroup selected
 * - Cmd/Ctrl + S : Toggle scenes panel
 * - Space + Drag : Pan canvas (handled in workspace)
 * - Ctrl/Cmd + Scroll : Zoom (handled in workspace)
 * - Scroll : Pan (handled in workspace)
 */
export function useCanvasShortcuts({
  onToggleSidebar,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToView,
  onDelete,
  onEscape,
  onToggleHelp,
  onSelectAll,
  onDuplicate,
  onGroup,
  onUngroup,
  onToggleScenes,
  enabled = true,
}: CanvasShortcutsConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      // Select all: Cmd/Ctrl + A
      if (isMod && e.key.toLowerCase() === "a") {
        e.preventDefault()
        onSelectAll()
        return
      }

      // Duplicate: Cmd/Ctrl + D
      if (isMod && e.key.toLowerCase() === "d") {
        e.preventDefault()
        onDuplicate()
        return
      }

      // Group: Cmd/Ctrl + G
      if (isMod && e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault()
        onGroup()
        return
      }

      // Ungroup: Cmd/Ctrl + Shift + G
      if (isMod && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault()
        onUngroup()
        return
      }

      // Scenes: Cmd/Ctrl + S
      if (isMod && e.key.toLowerCase() === "s") {
        e.preventDefault()
        onToggleScenes()
        return
      }

      // Toggle sidebar: [ or ]
      if (e.key === "[" || e.key === "]") {
        e.preventDefault()
        onToggleSidebar()
        return
      }

      // Zoom in: + or =
      if (e.key === "+" || e.key === "=") {
        e.preventDefault()
        onZoomIn()
        return
      }

      // Zoom out: -
      if (e.key === "-") {
        e.preventDefault()
        onZoomOut()
        return
      }

      // Reset zoom: 0
      if (e.key === "0" && !isMod) {
        e.preventDefault()
        onResetZoom()
        return
      }

      // Fit to view: 1
      if (e.key === "1" && !isMod) {
        e.preventDefault()
        onFitToView()
        return
      }

      // Delete selected: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        onDelete()
        return
      }

      // Escape: deselect
      if (e.key === "Escape") {
        e.preventDefault()
        onEscape()
        return
      }

      // Help: ?
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault()
        onToggleHelp()
        return
      }
    },
    [
      enabled,
      onToggleSidebar,
      onZoomIn,
      onZoomOut,
      onResetZoom,
      onFitToView,
      onDelete,
      onEscape,
      onToggleHelp,
      onSelectAll,
      onDuplicate,
      onGroup,
      onUngroup,
      onToggleScenes,
    ]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}

// Shortcut definitions for display
export const CANVAS_SHORTCUTS = [
  { keys: ["[", "]"], description: "Toggle sidebar" },
  { keys: ["+", "="], description: "Zoom in" },
  { keys: ["-"], description: "Zoom out" },
  { keys: ["0"], description: "Reset zoom (100%)" },
  { keys: ["1"], description: "Fit all in view" },
  { keys: ["Space"], description: "Hold + drag to pan" },
  { keys: ["Scroll"], description: "Pan canvas" },
  { keys: ["⌘", "Scroll"], description: "Zoom" },
  { keys: ["Delete"], description: "Delete selected" },
  { keys: ["Esc"], description: "Deselect" },
  { keys: ["⌘", "A"], description: "Select all" },
  { keys: ["⌘", "D"], description: "Duplicate selected" },
  { keys: ["⌘", "G"], description: "Group selected" },
  { keys: ["⌘", "⇧", "G"], description: "Ungroup" },
  { keys: ["⌘", "S"], description: "Toggle scenes" },
  { keys: ["Shift", "Click"], description: "Multi-select" },
  { keys: ["Drag"], description: "Box select" },
  { keys: ["?"], description: "Show shortcuts" },
]
