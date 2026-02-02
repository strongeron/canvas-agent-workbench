import { CourseTabScheduleTeacher } from "@thicket/platform/Teacher/CourseTabSchedule"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

const sampleLessons = [
  {
    id: 1,
    title: "Welcome & Overview",
    description: "Kickoff session covering course goals.",
    position: 0,
    topics: ["Introductions", "Expectations"],
    scheduled_at: "2024-10-01T17:00:00Z",
    whereby_room_url: "https://whereby.com/example",
  },
  {
    id: 2,
    title: "Deep Dive",
    description: "Core content with discussion prompts.",
    position: 1,
    topics: ["Key concepts", "Case studies"],
    scheduled_at: "2024-10-08T17:00:00Z",
    whereby_room_url: "",
    recording_url: "",
  },
]

export const courseTabScheduleTeacherMeta: GalleryComponentMeta = {
  id: "teacher/course-tab-schedule",
  sourceId: "@thicket/platform/Teacher/CourseTabSchedule#CourseTabScheduleTeacher",
  status: "prod",
}

export const courseTabScheduleTeacherGalleryEntry: GalleryEntry<{
  courseId: number
  lessons: typeof sampleLessons
  courseCoverUrl?: string
  learningObjectives?: string[]
  userTimezone?: string
  courseTimezone?: string
}> = {
  name: "CourseTabScheduleTeacher",
  importPath: courseTabScheduleTeacherMeta.sourceId.split("#")[0],
  category: "Teacher Experience",
  id: courseTabScheduleTeacherMeta.id,
  layoutSize: "large",
  meta: courseTabScheduleTeacherMeta,
  variants: [
    {
      name: "With Live and Upcoming",
      description: "Schedule showing grouped lessons",
      props: {
        courseId: 42,
        lessons: sampleLessons,
        courseCoverUrl: "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg",
        learningObjectives: ["Engage students", "Outline expectations"],
        userTimezone: "America/New_York",
        courseTimezone: "America/New_York",
      },
      status: "prod",
      category: "state",
    },
  ],
}
