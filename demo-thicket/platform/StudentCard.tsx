import { usePage } from "@thicket/shims/inertia-react"
import { BookOpen, Mail } from "lucide-react"
import { useState } from "react"

import { Badge } from "@thicket/components/ui/badge"
import { Button } from "@thicket/components/ui/button"
import type { Student } from "@thicket/types"

import { MessageComposerModal } from "./MessageComposerModal"

const CURRENT_TIME = Date.now()

interface StudentCardProps {
  student: Student
  onMessageSent?: () => void
  basePath?: string
  instructorCourses?: { id: number; title: string }[]
  teacherInfo?: { id: number; name: string; avatar_url: string }
}

export function StudentCard({ student, onMessageSent, basePath: _basePath = "/teacher", instructorCourses, teacherInfo }: StudentCardProps) {
  const [showMessageModal, setShowMessageModal] = useState(false)
  const page = usePage()

  const pageTeacherInfo = teacherInfo || {
    id: (page.props.authenticated_user as { id?: number })?.id || 2,
    name: (page.props.authenticated_user as { name?: string })?.name || "Teacher",
    avatar_url: (page.props.authenticated_user as { avatar_url?: string })?.avatar_url || "",
  }

  const pageCourses = instructorCourses || (page.props.instructor_courses as { id: number; title: string }[] | undefined) || []

  const isActive =
    new Date(student.last_activity) >
    new Date(CURRENT_TIME - 7 * 24 * 60 * 60 * 1000)

  return (
    <>
      <div className="bg-surface-50 border-default flex h-full flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="flex flex-1 flex-col p-6">
            <div className="mb-5 flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <img
                  src={student.avatar_url}
                  alt={student.name}
                  className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-md ring-2 ring-gray-100"
                />
                {isActive && (
                  <div className="absolute bottom-0 right-0 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-white bg-green-500 shadow-sm" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-foreground mb-1 truncate text-lg font-bold">
                  {student.name}
                </h3>

                <p className="text-muted-foreground mb-3 truncate text-sm" title={student.email}>
                  {student.email}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="default" size="sm">
                    <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
                    {student.enrolled_courses.length} {student.enrolled_courses.length === 1 ? "course" : "courses"}
                  </Badge>
                  <Badge
                    variant={isActive ? "brand" : "default"}
                    size="sm"
                  >
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {student.bio && (
              <div className="mb-4 border-t border-default pt-4">
                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                  {student.bio}
                </p>
              </div>
            )}

            <div className="mb-4 space-y-3 border-t border-default pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">Overall Progress</span>
                <span className="text-foreground text-sm font-semibold tabular-nums">
                  {student.overall_progress}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-100 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 shadow-sm transition-all duration-500 ease-out"
                  style={{ width: `${student.overall_progress}%` }}
                />
              </div>

              {student.timezone && (
                <div className="pt-2">
                  <p className="text-muted flex items-center gap-1 text-xs">
                    <span className="font-medium">Timezone:</span>
                    <span>{student.timezone}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-auto flex items-center gap-2 border-t border-default pt-4">
              <Button
                variant="ghost"
                size="sm"
                rounded="lg"
                icon={Mail}
                onClick={() => setShowMessageModal(true)}
                aria-label="Send message"
              >
                Message
              </Button>
            </div>
          </div>
        </div>

      <MessageComposerModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        recipient={student}
        availableCourses={pageCourses}
        teacherInfo={pageTeacherInfo}
        userRole="teacher"
        onSent={() => {
          setShowMessageModal(false)
          onMessageSent?.()
        }}
      />
    </>
  )
}
