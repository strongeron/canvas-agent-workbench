import type { CourseTabHomeProps } from '../../platform/Student/CourseTabHome'

import { GALLERY_COURSES, GALLERY_INSTRUCTORS } from '../../platform/gallery/mocks/galleryData'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export const courseTabHomeMeta: GalleryComponentMeta = {
  id: 'student/course-tab-home',
  sourceId: '../../platform/Student/CourseTabHome#CourseTabHome',
  status: 'prod',
}

export const courseTabHomeGalleryEntry: GalleryEntry<CourseTabHomeProps> = {
  id: courseTabHomeMeta.id,
  name: 'CourseTabHome',
  importPath: courseTabHomeMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'large',
  meta: courseTabHomeMeta,
  variants: [
    {
      name: 'Course Overview',
      description: 'Home tab showing course overview with announcements',
      props: {
        course: {
          ...GALLERY_COURSES[0],
          learning_objectives: [
            'Master Gothic architectural principles',
            'Understand structural innovations',
            'Analyze historical context',
          ],
        },
        instructor: GALLERY_INSTRUCTORS[0],
        announcements: [
          {
            id: 1,
            title: 'Welcome to the Course',
            content: 'Looking forward to an exciting semester together!',
            created_at: '2025-11-01T10:00:00Z',
            author: GALLERY_INSTRUCTORS[0].name,
          },
        ],
        nextLesson: {
          id: 1,
          title: 'Gothic Architecture Basics',
          description: 'Introduction to Gothic architectural elements',
          position: 3,
          scheduled_at: '2025-11-20T14:00:00Z',
          topics: ['Flying buttresses', 'Pointed arches'],
          is_completed: false,
          is_locked: false,
        },
        classmatesCount: 15,
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
