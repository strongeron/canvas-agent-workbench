import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

interface UnifiedLessonData {
  id: number
  courseId: number
  courseTitle?: string
  courseCoverUrl?: string
  lessonId: number
  lessonTitle: string
  lessonDescription: string
  lessonPosition: number
  scheduledAt?: string
  wherebyRoomUrl?: string
  recordingUrl?: string
  startedAt?: string
  topics?: string[]
  isCompleted?: boolean
  isLocked?: boolean
  isNext?: boolean
  learningObjectives?: string[]
  assignments?: any[]
  classmatesCount?: number
  enrolledStudentsCount?: number
  courseTimezone?: string
  userTimezone: string
}

interface LessonCardProps {
  lesson: UnifiedLessonData
  mode: "dashboard" | "schedule" | "course-details" | "hero"
}

const lessonCardNewMeta: GalleryComponentMeta = {
    id: 'student/lesson-card-new',
  sourceId: '@thicket/platform/Student/LessonCardNew#LessonCardNew',
  status: 'archive',
}

export const lessonCardNewGalleryEntry: GalleryEntry<LessonCardProps> = {
  name: 'LessonCardNew',
  importPath: lessonCardNewMeta.sourceId.split('#')[0],
  category: 'Student',
  id: 'student/lesson-card-new',
  layoutSize: 'medium',
  variants: [
    {
      name: 'With Topics',
      description: 'Lesson card showing topics list',
      props: {
        lesson: {
          id: 1,
          courseId: 90001,
          courseTitle: "Introduction to Web Development",
          courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          lessonId: 1,
          lessonTitle: "JavaScript Fundamentals",
          lessonDescription: "Learn core JavaScript concepts",
          lessonPosition: 1,
          scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          topics: ["Variables", "Functions", "Objects", "Arrays"],
          userTimezone: "America/New_York",
        },
        mode: "course-details",
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Live Lesson',
      description: 'Currently active lesson',
      props: {
        lesson: {
          id: 2,
          courseId: 90001,
          courseTitle: "Introduction to Web Development",
          courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          lessonId: 2,
          lessonTitle: "React Components",
          lessonDescription: "Building React components",
          lessonPosition: 2,
          scheduledAt: new Date().toISOString(),
          wherebyRoomUrl: "https://whereby.com/room",
          classmatesCount: 18,
          userTimezone: "America/New_York",
        },
        mode: "dashboard",
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
