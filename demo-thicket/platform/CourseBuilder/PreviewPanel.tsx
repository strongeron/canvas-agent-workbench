import { CoursePreviewCard } from "../../components/course-preview-card"
import { StatusBadge } from "../../components/ui/status-badge"
import type { Course } from "../../types"

export interface PreviewPanelProps {
  courseData: Partial<Course> & {
    title: string
    description: string
  }
  instructor: {
    id?: number
    name: string
    avatar_url?: string
  }
}

export function PreviewPanel({ courseData, instructor }: PreviewPanelProps) {
  const mockCourse: Course = {
    id: 0,
    title: courseData.title || "Untitled Course",
    description: courseData.description || "No description yet",
    price: courseData.price ?? 0,
    state: (courseData.state === "waitlist" ? "draft" : courseData.state) || "draft",
    learning_objectives: courseData.learning_objectives || [],
    lessons_count: courseData.lessons_count || 0,
    starts_at: courseData.starts_at || null,
    created_at: new Date().toISOString(),
    curriculum: courseData.curriculum || [],
    category: courseData.category || null,
    instructor: {
      id: instructor.id || 1,
      name: instructor.name,
      avatar_url: instructor.avatar_url,
      bio: "",
      credentials: "",
      specializations: [],
    },
    cover_url: courseData.cover_url,
  }

  return (
    <div className="bg-surface-50 sticky top-0 h-screen overflow-y-auto border-l border-default p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-foreground text-lg font-bold">
            Card Preview
          </h3>
          <StatusBadge status={mockCourse.state} size="sm" />
        </div>
        <p className="text-muted text-xs">
          Live preview of how your course card will appear
        </p>
      </div>

      <div className="space-y-6">
        <div className="max-w-sm">
          <CoursePreviewCard course={mockCourse} />
        </div>

        {mockCourse.learning_objectives.length > 0 && (
          <div className="rounded-lg border border-default bg-white p-4">
            <h4 className="text-foreground mb-3 text-sm font-semibold">
              What you&apos;ll learn
            </h4>
            <ul className="space-y-2">
              {mockCourse.learning_objectives.slice(0, 3).map((objective, index) => (
                <li key={index} className="text-muted-foreground flex items-start gap-2 text-xs">
                  <span className="text-brand-500 mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
                  <span>{objective}</span>
                </li>
              ))}
              {mockCourse.learning_objectives.length > 3 && (
                <li className="text-muted text-xs italic">
                  +{mockCourse.learning_objectives.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {mockCourse.curriculum.length > 0 && (
          <div className="rounded-lg border-t-2 border-b-2 border-l border-r border-default bg-white p-4">
            <h4 className="text-foreground mb-3 text-sm font-semibold">
              Course Schedule ({mockCourse.lessons_count} weeks)
            </h4>
            <div className="space-y-2">
              {mockCourse.curriculum.slice(0, 4).map((lesson) => (
                <div key={lesson.id} className="flex items-start gap-3">
                  <div className="bg-brand-50 text-brand-700 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-semibold">
                    {lesson.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs font-medium line-clamp-1">
                      {lesson.title || "Untitled"}
                    </p>
                    {lesson.topics.length > 0 && (
                      <p className="text-muted text-xs">
                        {lesson.topics.length} topic{lesson.topics.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {mockCourse.curriculum.length > 4 && (
                <p className="text-muted text-xs italic">
                  +{mockCourse.curriculum.length - 4} more lessons
                </p>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-default pt-4">
          <p className="text-muted text-xs italic">
            Preview updates as you type
          </p>
        </div>
      </div>
    </div>
  )
}
