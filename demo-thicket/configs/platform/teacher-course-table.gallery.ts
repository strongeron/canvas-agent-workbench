import type { ComponentProps } from 'react'

import type { TeacherCourseTable } from '../../platform/TeacherCourseTable'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import { GALLERY_COURSES } from "../../platform/gallery/mocks/galleryData"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

type TeacherCourseTableProps = ComponentProps<typeof TeacherCourseTable>

export const teacherCourseTableMeta: GalleryComponentMeta = {
  id: 'platform/teacher-course-table',
  sourceId: '../../platform/TeacherCourseTable#TeacherCourseTable',
  status: 'prod',
}

/**
 * TeacherCourseTable - table view with sortable columns and course actions.
 * Displays enrollment, dates, status, and pricing information.
 */
export const teacherCourseTableGalleryEntry: GalleryEntry<TeacherCourseTableProps> = {
  name: 'TeacherCourseTable',
  importPath: teacherCourseTableMeta.sourceId.split('#')[0],
  category: 'Teacher Tools',
  id: teacherCourseTableMeta.id,
  layoutSize: 'large',
  meta: teacherCourseTableMeta,
  variants: [
    {
      name: 'Course Table',
      description: 'Table view of instructor courses',
      props: { courses: GALLERY_COURSES.slice(0, 4), onPublish: () => {}, onDuplicate: () => {}, onArchive: () => {} },
      status: 'prod',
      category: 'variant',
    },
  ],
}
