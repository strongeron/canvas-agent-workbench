import type { StudentCourseTableProps } from '@thicket/platform/Student/StudentCourseTable'

import { GALLERY_COURSES, GALLERY_ENROLLED_COURSES } from '@thicket/platform/gallery/mocks/galleryData'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export const studentCourseTableMeta: GalleryComponentMeta = {
  id: 'student/student-course-table',
  sourceId: '@thicket/platform/Student/StudentCourseTable#StudentCourseTable',
  status: 'prod',
}

export const studentCourseTableGalleryEntry: GalleryEntry<StudentCourseTableProps> = {
  id: studentCourseTableMeta.id,
  name: 'StudentCourseTable',
  importPath: studentCourseTableMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'large',
  meta: studentCourseTableMeta,
  variants: [
    {
      name: 'Enrolled Courses Table',
      description: 'Table view of student courses',
      props: {
        enrolledCourses: [
          {
            course: GALLERY_COURSES[0],
            enrollment: {
              enrolled_at: GALLERY_ENROLLED_COURSES[0].enrolled_at,
              next_lesson_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              next_lesson_id: 90001,
              completed_lessons: [1, 2],
              progress_percentage: 65,
              whereby_room_url: 'https://whereby.com/demo-room',
            },
          },
          {
            course: GALLERY_COURSES[1],
            enrollment: {
              enrolled_at: GALLERY_ENROLLED_COURSES[1].enrolled_at,
              next_lesson_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              next_lesson_id: 90002,
              completed_lessons: [],
              progress_percentage: 42,
            },
          },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
