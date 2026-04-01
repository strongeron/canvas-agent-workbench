import { useCallback, useState } from "react"

export function useCanvasItemContextMenu({
  isSelected,
  interactMode,
  onSelect,
}: {
  isSelected: boolean
  interactMode: boolean
  onSelect: (addToSelection?: boolean) => void
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (interactMode) return
      event.preventDefault()
      event.stopPropagation()
      if (!isSelected) {
        onSelect(false)
      }
      setContextMenu({ x: event.clientX, y: event.clientY })
    },
    [interactMode, isSelected, onSelect]
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  return {
    contextMenu,
    handleContextMenu,
    closeContextMenu,
  }
}
