import { MessageSquare } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@thicket/components/ui/button"
import type { CurrentUser } from "@thicket/platform/hooks/useMessageComposer"
import { StudentMessageComposerModal } from "@thicket/platform/Messages/StudentMessageComposerModal"

interface Classmate {
  id: number
  name: string
  avatar_url: string
}

export interface CourseTabClassmatesProps {
  classmates: Classmate[]
  courseId: number
  courseName: string
  instructorId?: number
  instructorName?: string
  instructorAvatar?: string
  currentUser: CurrentUser
}

export function CourseTabClassmates({
  classmates,
  courseId,
  courseName,
  instructorId,
  instructorName,
  instructorAvatar,
  currentUser,
}: CourseTabClassmatesProps) {
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false)

  const availableRecipients = useMemo(() => {
    const recipients: {
      id: number
      name: string
      type: "teacher" | "student"
      avatar_url: string
      course_ids: number[]
    }[] = []

    if (instructorId && instructorName && instructorAvatar) {
      recipients.push({
        id: instructorId,
        name: instructorName,
        type: "teacher",
        avatar_url: instructorAvatar,
        course_ids: [courseId],
      })
    }

    classmates.forEach((classmate) => {
      recipients.push({
        id: classmate.id,
        name: classmate.name,
        type: "student",
        avatar_url: classmate.avatar_url,
        course_ids: [courseId],
      })
    })

    return recipients
  }, [classmates, courseId, instructorId, instructorName, instructorAvatar])

  const availableCourses = useMemo(() => [
    {
      id: courseId,
      name: courseName,
      instructor: instructorId && instructorName && instructorAvatar
        ? {
            id: instructorId,
            name: instructorName,
            avatar_url: instructorAvatar,
          }
        : undefined,
    },
  ], [courseId, courseName, instructorId, instructorName, instructorAvatar])

  const handleMessageClick = (_classmateId: number) => {
    setIsComposeModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsComposeModalOpen(false)
  }
  return (
    <div>
      <div className="mb-6 text-muted-foreground">
        {classmates.length} {classmates.length === 1 ? "student" : "students"}{" "}
        enrolled in this course
      </div>

      {classmates.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-surface-200 bg-surface-50 p-12 text-center">
          <p className="text-muted-foreground">No other students enrolled yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classmates.map((classmate) => (
            <div
              key={classmate.id}
              className="flex items-center gap-4 rounded-lg border border-default bg-white p-4 transition-shadow hover:shadow-md"
            >
              <img
                src={classmate.avatar_url}
                alt={classmate.name}
                className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground mb-2 font-semibold truncate">
                  {classmate.name}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMessageClick(classmate.id)}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <StudentMessageComposerModal
        isOpen={isComposeModalOpen}
        onClose={handleCloseModal}
        currentUser={currentUser}
        availableRecipients={availableRecipients}
        availableCourses={availableCourses}
        onSent={() => {
          handleCloseModal()
        }}
      />
    </div>
  )
}
