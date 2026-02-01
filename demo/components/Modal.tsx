/**
 * Modal - Demo modal component for gallery
 */

import { X } from "lucide-react"
import type { ReactNode } from "react"

export interface ModalProps {
  isOpen?: boolean
  onClose?: () => void
  title?: string
  children?: ReactNode
  size?: "sm" | "md" | "lg"
  showCloseButton?: boolean
}

export function Modal({
  isOpen = false,
  onClose,
  title = "Modal Title",
  children,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  }

  return (
    <div className={`w-full ${sizeClasses[size]} rounded-lg bg-white shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {children || (
          <p className="text-gray-600">
            This is the modal content. You can put anything here.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <button
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Confirm
        </button>
      </div>
    </div>
  )
}
