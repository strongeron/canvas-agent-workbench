import { WeekScheduleItem } from "./week-schedule-item"
import type { Lesson } from "../types"
import type { LessonWithProgress } from "../types/serializers/StudentCoursesShow"

type CourseScheduleCurriculum = Lesson[] | LessonWithProgress[]

function isLessonWithProgress(lesson: Lesson | LessonWithProgress): lesson is LessonWithProgress {
  return 'is_completed' in lesson && 'is_locked' in lesson
}

interface CourseScheduleProps {
  curriculum: CourseScheduleCurriculum
  courseId?: number
  context?: "public" | "student" | "teacher"
}

export function CourseSchedule({ curriculum, courseId, context = "public" }: CourseScheduleProps) {
  if (!curriculum || curriculum.length === 0) {
    return null
  }

  const isStudentView = context === "student" || (curriculum.length > 0 && isLessonWithProgress(curriculum[0]))

  return (
    <section className="mt-12">
      <h2 className="text-foreground font-display mb-6 text-2xl font-bold">
        {isStudentView ? "Your Schedule" : "Course Schedule"}
      </h2>
      <div className="space-y-4">
        {curriculum.map((week, index) => (
          <WeekScheduleItem
            key={week.id || index}
            week={week}
            isFirst={index === 0}
            courseId={courseId}
          />
        ))}
      </div>
    </section>
  )
}
