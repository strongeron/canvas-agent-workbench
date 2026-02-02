// @ts-nocheck
import type { CourseTabClassmatesProps } from '../../platform/Student/CourseTabClassmates'

import { GALLERY_COURSES, GALLERY_INSTRUCTORS, GALLERY_STUDENTS } from '../../platform/gallery/mocks/galleryData'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export const courseTabClassmatesMeta: GalleryComponentMeta = {
  id: 'student/course-tab-classmates',
  sourceId: '../../platform/Student/CourseTabClassmates#CourseTabClassmates',
  status: 'prod',
}

const GALLERY_CURRENT_USER = {
  id: 99001,
  name: 'Current Student',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentStudent',
  type: 'student' as const,
}

export const courseTabClassmatesGalleryEntry: GalleryEntry<CourseTabClassmatesProps> = {
  id: courseTabClassmatesMeta.id,
  name: 'CourseTabClassmates',
  importPath: courseTabClassmatesMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'large',
  meta: courseTabClassmatesMeta,
  variants: [
    {
      name: 'With Classmates',
      description: 'Classmates tab showing enrolled students',
      props: {
        courseId: GALLERY_COURSES[0].id,
        courseName: GALLERY_COURSES[0].name,
        instructorId: GALLERY_INSTRUCTORS[0].id,
        instructorName: GALLERY_INSTRUCTORS[0].name,
        instructorAvatar: GALLERY_INSTRUCTORS[0].avatar_url,
        currentUser: GALLERY_CURRENT_USER,
        classmates: [
          {
            id: 1,
            name: GALLERY_STUDENTS[0].name,
            avatar_url: GALLERY_STUDENTS[0].avatar_url,
            progress_percentage: 75,
          },
          {
            id: 2,
            name: GALLERY_STUDENTS[1].name,
            avatar_url: GALLERY_STUDENTS[1].avatar_url,
            progress_percentage: 60,
          },
          {
            id: 3,
            name: GALLERY_STUDENTS[2].name,
            avatar_url: GALLERY_STUDENTS[2].avatar_url,
            progress_percentage: 90,
          },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
