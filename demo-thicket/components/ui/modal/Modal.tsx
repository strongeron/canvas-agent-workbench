import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: "small" | "medium" | "large" | "xlarge"
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  "aria-labelledby"?: string
  "aria-describedby"?: string
}

const sizeClasses = {
  small: "max-w-md",
  medium: "max-w-lg",
  large: "max-w-3xl",
  xlarge: "max-w-5xl",
}

const maxModalWidth = "max-w-[min(90vw,1400px)]"

export function Modal({
  isOpen,
  onClose,
  children,
  size = "medium",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = "hidden"

      setTimeout(() => {
        modalRef.current?.focus()
      }, 0)
    } else {
      document.body.style.overflow = "unset"

      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  useEffect(() => {
    if (!isOpen) return

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener("keydown", handleFocusTrap)
    return () => document.removeEventListener("keydown", handleFocusTrap)
  }, [isOpen])

  if (!isOpen) return null

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-backdrop absolute inset-0 cursor-pointer backdrop-blur-sm"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`bg-surface-50 relative max-h-[90vh] w-full ${sizeClasses[size]} ${maxModalWidth} overflow-y-auto rounded-xl px-6 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  )
}
