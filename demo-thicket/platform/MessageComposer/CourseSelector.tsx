import { BookOpen, Users } from "lucide-react"

import { Select } from "@thicket/components/ui/select"
import type { Course } from "@thicket/platform/hooks/useMessageComposer"

interface CourseSelectorProps {
  courses: Course[]
  selectedCourseId: number | null
  onCourseChange: (id: number | null) => void
  messageType?: "individual" | "announcement"
  disabled?: boolean
  showEnrolledCount?: boolean
}

export function CourseSelector({
  courses,
  selectedCourseId,
  onCourseChange,
  messageType = "individual",
  disabled = false,
  showEnrolledCount = false,
}: CourseSelectorProps) {
  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  const courseOptions = courses.map((course) => {
    const courseName = course.name || course.title || "Untitled Course"
    const label =
      showEnrolledCount && course.enrolled_students !== undefined
        ? `${courseName} (${course.enrolled_students} student${course.enrolled_students !== 1 ? "s" : ""})`
        : courseName

    return {
      value: course.id.toString(),
      label,
    }
  })

  return (
    <div>
      <label className="text-foreground mb-2 block text-sm font-medium">
        Course {courses.length > 0 && `(${courses.length} available)`}
      </label>
      <Select
        label="Course"
        hideLabel={true}
        value={selectedCourseId?.toString() || ""}
        onChange={(value) => onCourseChange(value ? Number(value) : null)}
        placeholder="Select a course..."
        options={courseOptions}
        disabled={disabled}
        className="text-sm"
      />
      <p className="mt-1.5 text-xs text-muted">
        {courses.length === 0 ? (
          "No courses available. Create a course to start messaging students."
        ) : messageType === "individual" ? (
          "Select a course to see enrolled students"
        ) : (
          "Select a course to send announcement to all enrolled students"
        )}
      </p>

      {selectedCourse && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
            <BookOpen className="h-5 w-5 text-brand-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-sm font-semibold truncate">
              {selectedCourse.name || selectedCourse.title}
            </p>
            {selectedCourse.enrolled_students !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Users className="h-3 w-3" />
                <span>{selectedCourse.enrolled_students} enrolled students</span>
              </div>
            )}
            {selectedCourse.instructor && (
              <p className="text-muted-foreground text-xs mt-0.5">
                Instructor: {selectedCourse.instructor.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
