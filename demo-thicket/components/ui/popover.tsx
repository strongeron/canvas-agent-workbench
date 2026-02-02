import {
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

import {
  type OverlayAlign,
  useOverlayPosition,
} from "../../hooks/use-overlay-position"
import { cn } from "../../lib/utils"

interface PopoverContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  triggerRef: RefObject<HTMLElement | null>
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

function usePopoverContext() {
  const context = useContext(PopoverContext)
  if (!context) {
    throw new Error("Popover components must be used within a Popover")
  }
  return context
}

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const triggerRef = useRef<HTMLElement>(null)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setIsOpen = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  children: ReactNode
  className?: string
}

export function PopoverTrigger({ children, className }: PopoverTriggerProps) {
  const { triggerRef, setIsOpen, isOpen } = usePopoverContext()

  const handleClick = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div
      ref={triggerRef as RefObject<HTMLDivElement>}
      onClick={handleClick}
      className={className}
    >
      {children}
    </div>
  )
}

interface PopoverContentProps {
  children: ReactNode
  align?: OverlayAlign
  offset?: number
  className?: string
}

export function PopoverContent({
  children,
  align = "start",
  offset = 8,
  className,
}: PopoverContentProps) {
  const { isOpen, setIsOpen, triggerRef } = usePopoverContext()
  const overlayRef = useRef<HTMLDivElement>(null)
  const { styles } = useOverlayPosition(triggerRef, overlayRef, {
    isOpen,
    align,
    offset,
  })

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !triggerRef.current?.contains(target) &&
        !overlayRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
    }, 0)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, setIsOpen, triggerRef])

  if (!isOpen) return null

  return createPortal(
    <div
      ref={overlayRef}
      style={styles}
      className={cn("popover-content", className)}
    >
      {children}
    </div>,
    document.body,
  )
}
