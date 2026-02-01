import type { ComponentProps } from 'react'

import type { TeacherCourseList } from '@/platform/components/TeacherCourseList'
import type { GalleryComponentMeta } from '../registry/types'
import { GALLERY_COURSES } from "../mocks/galleryData"
import type { GalleryEntry } from "../registry/types"

type TeacherCourseListProps = ComponentProps<typeof TeacherCourseList>

export const teacherCourseListMeta: GalleryComponentMeta = {
  id: 'platform/teacher-course-list',
  sourceId: '@/platform/components/TeacherCourseList#TeacherCourseList',
  status: 'prod',
}

/**
 * TeacherCourseList - grid or table view of instructor courses with filtering.
 * Includes view toggle, filters, and course management actions.
 */
export const teacherCourseListGalleryEntry: GalleryEntry<TeacherCourseListProps> = {
  name: 'TeacherCourseList',
  importPath: teacherCourseListMeta.sourceId.split('#')[0],
  category: 'Teacher Tools',
  id: teacherCourseListMeta.id,
  layoutSize: 'large',
  meta: teacherCourseListMeta,
  variants: [
    {
      name: 'Multiple Courses',
      description: 'List view of instructor courses',
      props: { courses: GALLERY_COURSES.slice(0, 3) },
      status: 'prod',
      category: 'variant',
    },
  ],
}
