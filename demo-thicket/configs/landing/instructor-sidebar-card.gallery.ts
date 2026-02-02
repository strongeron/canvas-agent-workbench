import { InstructorSidebarCard } from "../../components/instructor-sidebar-card"
import type Course from "../../types/serializers/Course"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

const sidebarCourse: Course = {
  id: 4,
  title: "Introduction to Classical Mythology",
  description: "Survey of myths and their cultural context in ancient Greece and Rome.",
  price: 210,
  state: "published",
  learning_objectives: ["Myth interpretation", "Cultural context"],
  lessons_count: 5,
  starts_at: "2024-11-05T17:00:00Z",
  created_at: "2024-08-10T09:00:00Z",
  curriculum: [],
  category: { id: 3, name: "Classics", icon: "Temple" },
  instructor: {
    id: 4,
    name: "Dr. Sappho Lyra",
    bio: "Classicist focusing on myth reception.",
    credentials: "PhD, Classics",
    specializations: ["Myth", "Reception studies"],
    avatar_url: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg",
  },
  cover_url: "https://images.pexels.com/photos/289586/pexels-photo-289586.jpeg",
}

export const instructorSidebarCardMeta: GalleryComponentMeta = {
  id: "landing.instructor-sidebar-card",
  sourceId: "../../components/instructor-sidebar-card#InstructorSidebarCard",
  status: "prod",
}

export const instructorSidebarCardGalleryEntry: GalleryEntry<{
  instructor: Course["instructor"]
  course: Course
  variant?: "public" | "student" | "teacher" | "preview"
  education?: { degree: string; field: string; institution: string }[]
  is_enrolled?: boolean
}> = {
  name: "InstructorSidebarCard",
  importPath: instructorSidebarCardMeta.sourceId.split("#")[0],
  category: "Landing",
  id: instructorSidebarCardMeta.id,
  layoutSize: "medium",
  meta: instructorSidebarCardMeta,
  variants: [
    {
      name: "Public",
      description: "Public view with enroll CTA",
      props: {
        instructor: sidebarCourse.instructor,
        course: sidebarCourse,
        variant: "public",
        education: [
          { degree: "PhD", field: "Classics", institution: "Oxford University" },
          { degree: "MA", field: "Ancient History", institution: "Cambridge University" },
        ],
      },
      status: "prod",
      category: "state",
    },
    {
      name: "Student Enrolled",
      description: "Student view with message action",
      props: {
        instructor: sidebarCourse.instructor,
        course: { ...sidebarCourse, state: "published" },
        variant: "student",
        is_enrolled: true,
      },
      status: "prod",
      category: "state",
    },
  ],
}
