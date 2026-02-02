import { AlertTriangle } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Modal } from "../../components/ui/modal"

export interface UnpublishCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  courseName: string;
}

export function UnpublishCourseModal({
  isOpen,
  onClose,
  onConfirm,
  courseName,
}: UnpublishCourseModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="medium"
      aria-labelledby="unpublish-course-title"
      aria-describedby="unpublish-course-description"
    >
      <Modal.Header id="unpublish-course-title" onClose={onClose}>
        Unpublish Course?
      </Modal.Header>
      
      <Modal.Body id="unpublish-course-description">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
          </div>

          <div className="text-center">
            <p className="mb-1 text-sm text-muted-foreground">Course:</p>
            <p className="text-lg font-semibold">{courseName}</p>
          </div>

          <Modal.Warning variant="warning" title="This will remove your course from the marketplace">
            <Modal.BulletList
              items={[
                "Course will no longer be visible to students",
                "Students cannot enroll until you republish",
                "You can make changes and resubmit for review",
                "Course will be saved as a draft",
              ]}
              bulletColor="text-warning"
              className="mt-3"
            />
          </Modal.Warning>

          <p className="text-center text-muted-foreground">
            Are you sure you want to unpublish this course?
          </p>
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Yes, Unpublish Course
          </Button>
      </Modal.Footer>
    </Modal>
  );
}
