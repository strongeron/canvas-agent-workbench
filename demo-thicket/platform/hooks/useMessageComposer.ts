import { useMemo, useState } from "react"

export type MessageComposerMode =
  | "teacher-individual"
  | "teacher-announcement"
  | "announcement-only"
  | "student-message"

export interface MessageRecipient {
  id: number
  name: string
  type: "student" | "teacher"
}

export interface MessageCourse {
  id: number
  title: string
  enrolled_count?: number
}

export interface UseMessageComposerOptions {
  mode: MessageComposerMode
  currentUser: { id: number; type: "student" | "teacher" }
  availableCourses: MessageCourse[]
  availableRecipients?: MessageRecipient[]
  preselectedRecipient?: MessageRecipient | null
  preselectedCourse?: MessageCourse | null
  onSent?: () => void
  onClose?: () => void
}

export function useMessageComposer(options: UseMessageComposerOptions) {
  const {
    availableCourses,
    availableRecipients = [],
    preselectedRecipient,
    preselectedCourse,
    onSent,
    onClose,
  } = options

  const [courseId, setCourseId] = useState<number | null>(preselectedCourse?.id ?? null)
  const [recipientId, setRecipientId] = useState<number | null>(preselectedRecipient?.id ?? null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [messageType, setMessageType] = useState<"announcement" | "individual">("individual")

  const selectedCourse = useMemo(
    () => availableCourses.find((course) => course.id === courseId) || null,
    [availableCourses, courseId],
  )

  const filteredRecipients = availableRecipients
  const instructorRecipients = availableRecipients.filter((r) => r.type === "teacher")
  const studentRecipients = availableRecipients.filter((r) => r.type === "student")

  const canSend = !!body && (messageType === "announcement" || !!recipientId)

  const handleSend = () => {
    if (!canSend) return
    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      onSent?.()
      onClose?.()
    }, 600)
  }

  const handleCourseChange = (id: number | null) => {
    setCourseId(id)
  }

  return {
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
  }
}

