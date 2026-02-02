import { AlertTriangle } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import { Modal } from "@thicket/components/ui/modal/"

interface ResetDraftModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  mode: "create" | "edit"
}

export function ResetDraftModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
}: ResetDraftModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      aria-labelledby="reset-draft-title"
      aria-describedby="reset-draft-description"
    >
      <Modal.Header id="reset-draft-title" onClose={onClose}>
        Reset Draft?
      </Modal.Header>
      <Modal.Body id="reset-draft-description">
        <div className="space-y-6">
          <Modal.Warning variant="error" title="This action cannot be undone" icon={AlertTriangle}>
            {mode === "create"
              ? "All your draft progress will be permanently deleted. You'll start with a completely empty form."
              : "Your draft changes will be discarded. You'll return to the original published course data."}
          </Modal.Warning>

          <Modal.Section title="What will be reset:">
            <Modal.BulletList
              items={[
                "Course title and description",
                "Cover image",
                "Learning objectives",
                "Weekly lessons and curriculum",
                "Schedule and pricing",
              ]}
              bulletColor="bg-error"
            />
          </Modal.Section>
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          onClick={onConfirm}
          className="bg-error hover:bg-error/90 border-transparent"
        >
          Reset Draft
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
