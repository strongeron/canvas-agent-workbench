import { Mail, Megaphone } from "lucide-react"

import { Button } from "../../components/ui/button"
import { Modal } from "../../components/ui/modal"
import {
  type UseMessageComposerOptions,
  useMessageComposer,
} from "../hooks/useMessageComposer"

import { AnnouncementPreview } from "./AnnouncementPreview"
import { CourseSelector } from "./CourseSelector"
import { MessageForm } from "./MessageForm"
import { MessageTypeToggle } from "./MessageTypeToggle"
import { RecipientSelector } from "./RecipientSelector"

export interface MessageComposerModalProps extends Omit<UseMessageComposerOptions, "onClose"> {
  isOpen: boolean
  onClose: () => void
}

export function MessageComposerModal({
  isOpen,
  onClose,
  mode,
  currentUser,
  availableCourses,
  availableRecipients = [],
  preselectedRecipient = null,
  preselectedCourse = null,
  onSent,
}: MessageComposerModalProps) {
  const {
    courseId,
    recipientId,
    setRecipientId,
    subject,
    setSubject,
    body,
    setBody,
    isSending,
    messageType,
    setMessageType,
    selectedCourse,
    filteredRecipients,
    instructorRecipients,
    studentRecipients,
    canSend,
    handleSend,
    handleCourseChange,
  } = useMessageComposer({
    mode,
    currentUser,
    availableCourses,
    availableRecipients,
    preselectedRecipient,
    preselectedCourse,
    onSent,
    onClose,
  })

  const showMessageTypeToggle = mode === "teacher-individual"
  const showRecipientSelector =
    (mode === "teacher-individual" && messageType === "individual") ||
    mode === "student-message"
  const showAnnouncementPreview =
    (mode === "teacher-individual" && messageType === "announcement") ||
    mode === "teacher-announcement" ||
    mode === "announcement-only"

  const isAnnouncementMode =
    mode === "teacher-announcement" ||
    mode === "announcement-only" ||
    (mode === "teacher-individual" && messageType === "announcement")

  const getHeaderContent = () => {
    if (isAnnouncementMode) {
      return {
        icon: Megaphone,
        title: "Make an Announcement",
        subtitle: "Broadcast to all enrolled students",
      }
    }

    if (mode === "student-message") {
      return {
        icon: Mail,
        title: "New Message",
        subtitle: "Compose a new message",
      }
    }

    return {
      icon: Mail,
      title: "New Message",
      subtitle: "Send a message to your students",
    }
  }

  const getButtonText = () => {
    if (isSending) return "Sending..."
    if (isAnnouncementMode) return "Send Announcement"
    return "Send Message"
  }

  const headerContent = getHeaderContent()

  const handleClose = () => {
    if (!isSending) {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlayClick={!isSending}
      closeOnEscape={!isSending}
      aria-labelledby="message-composer-title"
      aria-describedby="message-composer-description"
    >
      <Modal.Header
        id="message-composer-title"
        icon={headerContent.icon}
        subtitle={headerContent.subtitle}
        onClose={handleClose}
      >
        {headerContent.title}
      </Modal.Header>

      <Modal.Body id="message-composer-description">
        <div className="space-y-4">
          {showMessageTypeToggle && (
            <MessageTypeToggle
              value={messageType}
              onChange={setMessageType}
              disabled={isSending}
            />
          )}

          <CourseSelector
            courses={availableCourses}
            selectedCourseId={courseId}
            onCourseChange={handleCourseChange}
            messageType={messageType}
            disabled={isSending}
            showEnrolledCount={currentUser.type === "teacher"}
          />

          {courseId && showRecipientSelector && (
            <RecipientSelector
              recipients={filteredRecipients}
              instructorRecipients={instructorRecipients}
              studentRecipients={studentRecipients}
              selectedRecipientId={recipientId}
              onSelectRecipient={setRecipientId}
              disabled={isSending}
              showSections={mode === "student-message"}
            />
          )}

          {courseId && showAnnouncementPreview && (
            <AnnouncementPreview
              recipientCount={filteredRecipients.length}
              courseName={selectedCourse?.name || selectedCourse?.title}
              variant={mode === "announcement-only" ? "warning" : "info"}
            />
          )}

          <MessageForm
            subject={subject}
            onSubjectChange={setSubject}
            body={body}
            onBodyChange={setBody}
            disabled={isSending}
            subjectPlaceholder={
              isAnnouncementMode
                ? "Enter announcement subject"
                : "Enter message subject"
            }
            bodyPlaceholder={
              isAnnouncementMode
                ? "Type your announcement here..."
                : "Type your message here..."
            }
          />
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        <Button variant="outline" size="md" onClick={handleClose} disabled={isSending}>
          Cancel
        </Button>
        <Button
          variant="brand"
          size="md"
          onClick={() => {
            void handleSend()
          }}
          disabled={!canSend || isSending}
        >
          {getButtonText()}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
