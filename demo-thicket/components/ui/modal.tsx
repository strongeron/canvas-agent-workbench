import { X } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect } from "react"

/**
 * @deprecated Use the compound Modal from `@/components/ui/modal` (folder) instead.
 *
 * This simple modal is deprecated in favor of the compound modal pattern which provides:
 * - Better composition with Modal.Header, Modal.Body, Modal.Footer
 * - Built-in accessibility (focus trap, escape key, aria attributes)
 * - Consistent styling with Modal.Warning, Modal.Section, Modal.BulletList
 *
 * @example
 * // Instead of:
 * import { Modal } from './modal.tsx'
 * <Modal isOpen={isOpen} onClose={onClose} title="Title">
 *   <p>Content</p>
 * </Modal>
 *
 * // Use:
 * import { Modal } from './modal'
 * <Modal isOpen={isOpen} onClose={onClose}>
 *   <Modal.Header title="Title" onClose={onClose} />
 *   <Modal.Body>
 *     <p>Content</p>
 *   </Modal.Body>
 *   <Modal.Footer>
 *     <Button onClick={onClose}>Close</Button>
 *   </Modal.Footer>
 * </Modal>
 */
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  subtitle?: string
  size?: "small" | "medium" | "large"
}

const sizeClasses = {
  small: "max-w-md",
  medium: "max-w-lg",
  large: "max-w-3xl",
}

const maxModalWidth = "max-w-[min(90vw,1400px)]"

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  size = "medium",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-backdrop absolute inset-0 cursor-pointer backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`bg-surface-50 relative max-h-[90vh] w-full ${sizeClasses[size]} ${maxModalWidth} overflow-y-auto rounded-xl shadow-2xl`}
      >
        {(title ?? subtitle) && (
          <div className="border-default flex items-center justify-between border-b p-6">
            <div className="flex flex-1 items-start gap-3 pr-4">
              {title && (
                <h2 className="text-foreground font-display text-xl font-bold">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-surface-200 shrink-0 cursor-pointer rounded-lg p-2 transition-colors"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
