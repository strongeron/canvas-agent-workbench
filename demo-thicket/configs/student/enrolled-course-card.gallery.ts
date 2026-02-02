import type { EnrolledCourseCardProps } from '@thicket/platform/Student/EnrolledCourseCard'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import { GALLERY_COURSES } from '@thicket/platform/gallery/mocks/galleryData'
import type { GalleryEntry } from '../../registry/types'

const enrolledCourseCardMeta: GalleryComponentMeta = {
    id: 'student/enrolled-course-card',
  sourceId: '@thicket/platform/Student/EnrolledCourseCard#EnrolledCourseCardProps',
  status: 'archive',
}

export const enrolledCourseCardGalleryEntry: GalleryEntry<EnrolledCourseCardProps> = {
  id: 'student/enrolled-course-card',
  name: 'EnrolledCourseCard',
  importPath: enrolledCourseCardMeta.sourceId.split('#')[0],
  category: 'Student Experience',
  layoutSize: 'medium',
  variants: [
    {
      name: 'In Progress',
      description: 'Course card with progress',
      props: {
        enrolledCourse: {
          course: GALLERY_COURSES[0],
          enrollment: {
            next_lesson_date: '2025-11-20T14:00:00Z',
            next_lesson_id: 1,
            completed_lessons: [1, 2],
            progress_percentage: 45,
            whereby_room_url: 'https://whereby.com/demo-room',
          },
        },
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
