import { AlertTriangle } from "lucide-react"

import { Button } from "./button"
import { Modal } from "./modal/"

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "warning" | "danger"
  isProcessing?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isProcessing = false,
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm()
    if (!isProcessing) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="small">
      <Modal.Body padding="none" className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>

        <h3 className="text-foreground mb-2 text-lg font-bold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="outline"
          size="md"
          onClick={onClose}
          disabled={isProcessing}
          fullWidth
        >
          {cancelText}
        </Button>
        <Button
          variant="brand"
          size="md"
          onClick={handleConfirm}
          disabled={isProcessing}
          fullWidth
          className={
            variant === "danger"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-amber-600 hover:bg-amber-700"
          }
        >
          {isProcessing ? "Processing..." : confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
