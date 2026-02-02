import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { ScheduledLesson } from "../../platform/utils/scheduleUtils"

interface LiveLessonBannerProps {
  lessons: ScheduledLesson[]
  userTimezone?: string
}

export const liveLessonBannerMeta: GalleryComponentMeta = {
  id: 'teacher/live-lesson-banner',
  sourceId: '../../platform/Teacher/LiveLessonBanner#LiveLessonBanner',
  status: 'prod',
}

export const liveLessonBannerGalleryEntry: GalleryEntry<LiveLessonBannerProps> = {
  name: 'LiveLessonBanner',
  importPath: liveLessonBannerMeta.sourceId.split('#')[0],
  category: 'Teacher',
  id: liveLessonBannerMeta.id,
  layoutSize: 'large',
  meta: liveLessonBannerMeta,
  variants: [
    {
      name: 'Single Live Lesson',
      description: 'Banner with one active lesson',
      props: {
        lessons: [
          {
            id: 1,
            courseId: 90001,
            courseTitle: "Introduction to Web Development",
            courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
            lessonId: 1,
            lessonTitle: "JavaScript Fundamentals",
            lessonDescription: "Learn JavaScript basics",
            lessonPosition: 1,
            scheduledAt: new Date().toISOString(),
            hostWherebyUrl: "https://whereby.com/room?host=true",
            wherebyRoomUrl: "https://whereby.com/room",
            userTimezone: "America/New_York",
            enrolledStudentsCount: 15,
          },
        ],
        userTimezone: "America/New_York",
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Multiple Live Lessons',
      description: 'Banner with multiple concurrent lessons',
      props: {
        lessons: [
          {
            id: 1,
            courseId: 90001,
            courseTitle: "Introduction to Web Development",
            courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
            lessonId: 1,
            lessonTitle: "JavaScript Fundamentals",
            lessonDescription: "Learn JavaScript basics",
            lessonPosition: 1,
            scheduledAt: new Date().toISOString(),
            hostWherebyUrl: "https://whereby.com/room1?host=true",
            wherebyRoomUrl: "https://whereby.com/room1",
            userTimezone: "America/New_York",
            enrolledStudentsCount: 15,
          },
          {
            id: 2,
            courseId: 90002,
            courseTitle: "Advanced React Patterns",
            courseCoverUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
            lessonId: 2,
            lessonTitle: "Custom Hooks",
            lessonDescription: "Building reusable hooks",
            lessonPosition: 3,
            scheduledAt: new Date().toISOString(),
            hostWherebyUrl: "https://whereby.com/room2?host=true",
            wherebyRoomUrl: "https://whereby.com/room2",
            userTimezone: "America/New_York",
            enrolledStudentsCount: 22,
          },
        ],
        userTimezone: "America/New_York",
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
