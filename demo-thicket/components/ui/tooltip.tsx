import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  delay?: number
}

export function Tooltip({
  content,
  children,
  side = "right",
  delay = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<number | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    timeoutRef.current = window.setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const scrollY = window.scrollY
        const scrollX = window.scrollX

        let top = 0
        let left = 0

        switch (side) {
          case "top":
            top = rect.top + scrollY - 8
            left = rect.left + scrollX + rect.width / 2
            break
          case "right":
            top = rect.top + scrollY + rect.height / 2
            left = rect.right + scrollX + 8
            break
          case "bottom":
            top = rect.bottom + scrollY + 8
            left = rect.left + scrollX + rect.width / 2
            break
          case "left":
            top = rect.top + scrollY + rect.height / 2
            left = rect.left + scrollX - 8
            break
        }

        setPosition({ top, left })
      }
      setIsVisible(true)
    }, delay)
  }

  const handleClick = () => {
    hideTooltip()
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const sideClasses = {
    top: "-translate-x-1/2 -translate-y-full",
    right: "-translate-y-1/2",
    bottom: "-translate-x-1/2",
    left: "-translate-x-full -translate-y-1/2",
  }

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent",
  }

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={handleClick}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            className={`pointer-events-none fixed z-[9999] rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white shadow-lg transition-opacity duration-150 ${sideClasses[side]}`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
            role="tooltip"
          >
            {content}
            <div
              className={`absolute h-0 w-0 border-4 ${arrowClasses[side]}`}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
