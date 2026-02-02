import { CourseSchedule } from "@thicket/components/course-schedule"
import type Lesson from "@thicket/types/serializers/Lesson"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

const sampleCurriculum: Lesson[] = [
  {
    id: 1,
    title: "Foundations of the Renaissance",
    description: "Setting the stage with early influences and key figures.",
    position: 0,
    topics: ["Humanism", "Patronage", "Early masters"],
    assignments: [
      {
        id: 1,
        lesson_id: 1,
        filename: "reading-list.pdf",
        original_name: "reading-list.pdf",
        file_url: "https://example.com/reading-list.pdf",
        file_type: "application/pdf",
        file_size: 1024,
        uploaded_at: "2024-08-01T00:00:00Z",
      },
    ],
  },
  {
    id: 2,
    title: "Architecture and Innovation",
    description: "Exploring engineering feats and aesthetic breakthroughs.",
    position: 1,
    topics: ["Brunelleschi", "Duomo", "Perspective"],
    assignments: [],
    scheduled_at: "2024-10-10T17:00:00Z",
  },
]

export const courseScheduleMeta: GalleryComponentMeta = {
  id: "landing.course-schedule",
  sourceId: "@thicket/components/course-schedule#CourseSchedule",
  status: "prod",
}

export const courseScheduleGalleryEntry: GalleryEntry<{ curriculum: Lesson[]; courseId?: number; context?: "public" | "student" | "teacher" }> = {
  name: "CourseSchedule",
  importPath: courseScheduleMeta.sourceId.split("#")[0],
  category: "Landing",
  id: courseScheduleMeta.id,
  layoutSize: "full",
  meta: courseScheduleMeta,
  variants: [
    {
      name: "Public",
      description: "Public course schedule with lessons",
      props: { curriculum: sampleCurriculum, context: "public" },
      status: "prod",
      category: "state",
    },
  ],
}
