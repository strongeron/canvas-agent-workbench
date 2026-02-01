import type { UpcomingLessonsWidgetProps } from '@/platform/components/Student/UpcomingLessonsWidget'

import { GALLERY_COURSES } from '../mocks/galleryData'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

export const upcomingLessonsWidgetMeta: GalleryComponentMeta = {
  id: 'student/upcoming-lessons-widget',
  sourceId: '@/platform/components/Student/UpcomingLessonsWidget#UpcomingLessonsWidget',
  status: 'prod',
}

export const upcomingLessonsWidgetGalleryEntry: GalleryEntry<UpcomingLessonsWidgetProps> = {
  id: upcomingLessonsWidgetMeta.id,
  name: 'UpcomingLessonsWidget',
  importPath: upcomingLessonsWidgetMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'medium',
  meta: upcomingLessonsWidgetMeta,
  variants: [
    {
      name: 'Multiple Lessons',
      description: 'Widget showing upcoming lessons',
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
          },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
