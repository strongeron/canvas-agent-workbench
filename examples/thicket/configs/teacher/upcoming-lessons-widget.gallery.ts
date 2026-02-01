import type { UpcomingLessonsWidgetProps } from '@/platform/components/Teacher/UpcomingLessonsWidget'

import { GALLERY_COURSES } from '../mocks/galleryData'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

export const teacherUpcomingLessonsWidgetMeta: GalleryComponentMeta = {
  id: 'teacher/upcoming-lessons-widget',
  sourceId: '@/platform/components/Teacher/UpcomingLessonsWidget#UpcomingLessonsWidget',
  status: 'prod',
}

export const teacherUpcomingLessonsWidgetGalleryEntry: GalleryEntry<UpcomingLessonsWidgetProps> = {
  id: teacherUpcomingLessonsWidgetMeta.id,
  name: 'TeacherUpcomingLessonsWidget',
  importPath: teacherUpcomingLessonsWidgetMeta.sourceId.split('#')[0],
  category: 'Teacher Schedule Management',
  layoutSize: 'medium',
  meta: teacherUpcomingLessonsWidgetMeta,
  variants: [
    {
      name: 'Multiple Lessons',
      description: 'Widget showing upcoming teaching sessions',
      props: {
        lessons: [
          {
            id: 1,
            courseId: 1,
            courseTitle: GALLERY_COURSES[0].title,
            courseCoverUrl: GALLERY_COURSES[0].cover_url,
            lessonId: 2,
            lessonTitle: 'Gothic Architecture Basics',
            lessonDescription: 'Introduction to Gothic elements',
            lessonPosition: 2,
            scheduledAt: '2025-11-15T14:00:00Z',
            wherebyRoomUrl: 'https://whereby.com/demo-room',
            enrolledStudentsCount: 15,
          },
          {
            id: 2,
            courseId: 2,
            courseTitle: GALLERY_COURSES[1].title,
            courseCoverUrl: GALLERY_COURSES[1].cover_url,
            lessonId: 1,
            lessonTitle: 'Introduction to Watercolors',
            lessonDescription: 'Basic watercolor techniques',
            lessonPosition: 1,
            scheduledAt: '2025-11-16T10:00:00Z',
            wherebyRoomUrl: 'https://whereby.com/demo-room',
            enrolledStudentsCount: 8,
          },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
