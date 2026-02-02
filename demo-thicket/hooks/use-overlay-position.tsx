import { useLayoutEffect, useMemo, useState, type RefObject } from "react"

export type OverlayAlign = "start" | "center" | "end"

type OverlayOptions = {
  isOpen: boolean
  align?: OverlayAlign
  offset?: number
}

export function useOverlayPosition(
  triggerRef: RefObject<HTMLElement | null>,
  overlayRef: RefObject<HTMLElement | null>,
  { isOpen, align = "start", offset = 8 }: OverlayOptions,
) {
  const [styles, setStyles] = useState<React.CSSProperties>({
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 50,
  })

  useLayoutEffect(() => {
    if (!isOpen) return
    const trigger = triggerRef.current
    const overlay = overlayRef.current
    if (!trigger || !overlay) return

    const triggerRect = trigger.getBoundingClientRect()
    const overlayRect = overlay.getBoundingClientRect()

    let left = triggerRect.left
    if (align === "center") {
      left = triggerRect.left + triggerRect.width / 2 - overlayRect.width / 2
    } else if (align === "end") {
      left = triggerRect.right - overlayRect.width
    }

    const top = triggerRect.bottom + offset

    setStyles({
      position: "absolute",
      top: Math.max(8, top) + window.scrollY,
      left: Math.max(8, left) + window.scrollX,
      zIndex: 50,
    })
  }, [align, isOpen, offset, overlayRef, triggerRef])

  return useMemo(() => ({ styles }), [styles])
}

