import { Copy, Layers, Maximize2, Trash2 } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface CanvasContextMenuProps {
  position: { x: number; y: number }
  onClose: () => void
  onFitToContent: () => void
  onBringToFront: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function CanvasContextMenu({
  position,
  onClose,
  onFitToContent,
  onBringToFront,
  onDuplicate,
  onDelete,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if clicking outside the menu
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    // Use requestAnimationFrame to avoid immediate close from the right-click event
    const frameId = requestAnimationFrame(() => {
      document.addEventListener("click", handleClickOutside, true)
      document.addEventListener("contextmenu", handleClickOutside, true)
      document.addEventListener("keydown", handleEscape)
    })

    return () => {
      cancelAnimationFrame(frameId)
      document.removeEventListener("click", handleClickOutside, true)
      document.removeEventListener("contextmenu", handleClickOutside, true)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 180),
    y: Math.min(position.y, window.innerHeight - 200),
  }

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
    // Execute action after closing menu
    requestAnimationFrame(() => {
      action()
    })
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[160px] rounded-lg border border-default bg-white py-1 shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => handleAction(e, onFitToContent)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-surface-100"
        role="menuitem"
      >
        <Maximize2 className="h-4 w-4 text-muted-foreground" />
        Fit to content
      </button>

      <button
        type="button"
        onClick={(e) => handleAction(e, onBringToFront)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-surface-100"
        role="menuitem"
      >
        <Layers className="h-4 w-4 text-muted-foreground" />
        Bring to front
      </button>

      <button
        type="button"
        onClick={(e) => handleAction(e, onDuplicate)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-surface-100"
        role="menuitem"
      >
        <Copy className="h-4 w-4 text-muted-foreground" />
        Duplicate
      </button>

      <div className="my-1 border-t border-default" role="separator" />

      <button
        type="button"
        onClick={(e) => handleAction(e, onDelete)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        role="menuitem"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>,
    document.body
  )
}
