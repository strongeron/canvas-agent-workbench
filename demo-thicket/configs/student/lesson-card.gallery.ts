import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { GalleryComponentMeta } from '../../platform/gallery/types'

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
  userTimezone: string
}

interface LessonCardProps {
  lesson: UnifiedLessonData
  mode: "dashboard" | "schedule" | "course-details" | "hero"
}

const lessonCardMeta: GalleryComponentMeta = {
    id: 'student/lesson-card',
  sourceId: '../../platform/Student/LessonCard#LessonCard',
  status: 'archive',
}

export const lessonCardGalleryEntry: GalleryEntry<LessonCardProps> = {
  name: 'LessonCard',
  importPath: lessonCardMeta.sourceId.split('#')[0],
  category: 'Student',
  id: 'student/lesson-card',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Completed Lesson',
      description: 'Completed lesson with recording',
      props: {
        lesson: {
          id: 1,
          courseId: 90001,
          courseTitle: "Introduction to Web Development",
          courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          lessonId: 1,
          lessonTitle: "HTML Basics",
          lessonDescription: "Introduction to HTML structure",
          lessonPosition: 1,
          scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          isCompleted: true,
          recordingUrl: "https://whereby.com/recording/123",
          userTimezone: "America/New_York",
        },
        mode: "course-details",
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Locked Lesson',
      description: 'Future lesson that is locked',
      props: {
        lesson: {
          id: 3,
          courseId: 90001,
          lessonId: 3,
          lessonTitle: "Advanced CSS",
          lessonDescription: "Deep dive into CSS techniques",
          lessonPosition: 3,
          isLocked: true,
          userTimezone: "America/New_York",
        },
        mode: "course-details",
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Next Lesson',
      description: 'Upcoming lesson marked as next',
      props: {
        lesson: {
          id: 2,
          courseId: 90001,
          courseTitle: "Introduction to Web Development",
          courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          lessonId: 2,
          lessonTitle: "CSS Fundamentals",
          lessonDescription: "Learn CSS basics",
          lessonPosition: 2,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          isNext: true,
          wherebyRoomUrl: "https://whereby.com/room",
          userTimezone: "America/New_York",
        },
        mode: "dashboard",
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
