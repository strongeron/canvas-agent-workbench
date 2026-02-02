import type { TeacherLessonCardMode } from "../../platform/Teacher/TeacherLessonCard"
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { ScheduledLesson } from "../../platform/utils/scheduleUtils"
import type { GalleryComponentMeta } from '../../platform/gallery/types'

interface TeacherLessonCardProps {
  lesson: ScheduledLesson
  mode: TeacherLessonCardMode
  showActions?: boolean
}

const teacherLessonCardMeta: GalleryComponentMeta = {
    id: 'teacher/teacher-lesson-card',
  sourceId: '../../platform/Teacher/TeacherLessonCard#TeacherLessonCardMode',
  status: 'archive',
}

export const teacherLessonCardGalleryEntry: GalleryEntry<TeacherLessonCardProps> = {
  name: 'TeacherLessonCard',
  importPath: teacherLessonCardMeta.sourceId.split('#')[0],
  category: 'Teacher',
  id: 'teacher/teacher-lesson-card',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Live Lesson',
      description: 'Active lesson that teacher can join',
      props: {
        lesson: {
          id: 1,
          courseId: 90001,
          courseTitle: "Introduction to Web Development",
          courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          lessonTitle: "JavaScript Fundamentals",
          lessonDescription: "Learn the basics of JavaScript",
          scheduledAt: new Date().toISOString(),
          wherebyRoomUrl: "https://whereby.com/room",
          hostWherebyUrl: "https://whereby.com/room?host=true",
          userTimezone: "America/New_York",
          enrolledStudentsCount: 15,
        },
        mode: "dashboard",
        showActions: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Upcoming Lesson',
      description: 'Scheduled future lesson',
      props: {
        lesson: {
          id: 2,
          courseId: 90001,
          courseTitle: "Introduction to Web Development",
          courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          lessonTitle: "Advanced CSS Techniques",
          lessonDescription: "Deep dive into CSS Grid and Flexbox",
          scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          userTimezone: "America/New_York",
          enrolledStudentsCount: 18,
        },
        mode: "schedule",
        showActions: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Past Lesson',
      description: 'Completed lesson with recording',
      props: {
        lesson: {
          id: 3,
          courseId: 90001,
          courseTitle: "Introduction to Web Development",
          courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          lessonTitle: "HTML Basics",
          lessonDescription: "Introduction to HTML structure",
          scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          recordingUrl: "https://whereby.com/recording/123",
          userTimezone: "America/New_York",
          enrolledStudentsCount: 20,
        },
        mode: "course-details",
        showActions: false,
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
