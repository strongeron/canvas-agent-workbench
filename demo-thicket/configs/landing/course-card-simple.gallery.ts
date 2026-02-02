import { CourseCardSimple } from "../../components/course-card-simple"
import type Course from "../../types/serializers/Course"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

const publishedCourse: Course = {
  id: 2,
  title: "Modernist Literature: Forms and Experiments",
  description: "Analyze modernist texts and their groundbreaking narrative styles.",
  price: 240,
  state: "published",
  learning_objectives: ["Close reading", "Historical context"],
  lessons_count: 8,
  starts_at: "2024-10-10T18:00:00Z",
  created_at: "2024-08-05T10:00:00Z",
  curriculum: [],
  category: { id: 2, name: "Literature", icon: "Book" },
  instructor: {
    id: 2,
    name: "Prof. James Baldwin",
    bio: "Specialist in 20th century literature.",
    credentials: "PhD, Literature",
    specializations: ["Modernism", "Narrative theory"],
    avatar_url: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg",
  },
  cover_url: "https://images.pexels.com/photos/46274/pexels-photo-46274.jpeg",
}

const waitlistCourse: Course = {
  ...publishedCourse,
  id: 3,
  title: "Philosophy of Science: Thinking About Knowledge",
  state: "waitlist",
  price: 200,
  starts_at: null,
}

export const courseCardSimpleMeta: GalleryComponentMeta = {
  id: "landing.course-card-simple",
  sourceId: "../../components/course-card-simple#CourseCardSimple",
  status: "prod",
}

export const courseCardSimpleGalleryEntry: GalleryEntry<{ course: Course; studentId?: number; showCTA?: boolean }> = {
  name: "CourseCardSimple",
  importPath: courseCardSimpleMeta.sourceId.split("#")[0],
  category: "Landing",
  id: courseCardSimpleMeta.id,
  layoutSize: "medium",
  meta: courseCardSimpleMeta,
  variants: [
    {
      name: "Published",
      description: "Standard published course card",
      props: { course: publishedCourse, showCTA: true },
      status: "prod",
      category: "state",
    },
    {
      name: "Waitlist",
      description: "Waitlist CTA state",
      props: { course: waitlistCourse, showCTA: true },
      status: "archive",
      category: "state",
    },
  ],
}
