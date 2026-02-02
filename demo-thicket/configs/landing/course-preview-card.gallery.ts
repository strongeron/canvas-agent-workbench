import { CoursePreviewCard } from "../../components/course-preview-card"
import type Course from "../../types/serializers/Course"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

const sampleCourse: Course = {
  id: 1,
  title: "Renaissance Art and Architecture",
  description: "Trace the evolution of art and architecture across the Italian Renaissance.",
  price: 180,
  state: "published",
  learning_objectives: ["Understand key works", "Discuss cultural impact"],
  lessons_count: 6,
  starts_at: "2024-10-01T17:00:00Z",
  created_at: "2024-08-01T12:00:00Z",
  curriculum: [],
  category: { id: 1, name: "Art History", icon: "Palette" },
  instructor: {
    id: 1,
    name: "Dr. Ada Lovelace",
    bio: "Art historian focused on Renaissance Italy.",
    credentials: "PhD, Art History",
    specializations: ["Renaissance", "Architecture"],
    avatar_url: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
  },
  cover_url: "https://images.pexels.com/photos/161931/italy-ancient-antique-architecture-161931.jpeg",
}

export const coursePreviewCardMeta: GalleryComponentMeta = {
  id: "landing.course-preview-card",
  sourceId: "../../components/course-preview-card#CoursePreviewCard",
  status: "prod",
}

export const coursePreviewCardGalleryEntry: GalleryEntry<{ course: Course }> = {
  name: "CoursePreviewCard",
  importPath: coursePreviewCardMeta.sourceId.split("#")[0],
  category: "Landing",
  id: coursePreviewCardMeta.id,
  layoutSize: "medium",
  meta: coursePreviewCardMeta,
  variants: [
    {
      name: "Published Course",
      description: "Preview card with published course data",
      props: { course: sampleCourse },
      status: "prod",
      category: "state",
    },
  ],
}
