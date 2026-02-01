import type { ComponentProps } from 'react'

import type { StudentTableView } from '@/platform/components/StudentTableView'
import type { GalleryComponentMeta } from '../registry/types'
import { GALLERY_STUDENTS } from "../mocks/galleryData"
import type { GalleryEntry } from "../registry/types"

type StudentTableViewProps = ComponentProps<typeof StudentTableView>

export const studentTableViewMeta: GalleryComponentMeta = {
  id: 'platform/student-table-view',
  sourceId: '@/platform/components/StudentTableView#StudentTableView',
  status: 'prod',
}

/**
 * StudentTableView - sortable table displaying student roster with progress tracking.
 * Used in teacher dashboard for student management.
 */
export const studentTableViewGalleryEntry: GalleryEntry<StudentTableViewProps> = {
  name: 'StudentTableView',
  importPath: studentTableViewMeta.sourceId.split('#')[0],
  category: 'Teacher Tools',
  id: studentTableViewMeta.id,
  layoutSize: 'large',
  meta: studentTableViewMeta,
  variants: [
    {
      name: 'Multiple Students',
      description: 'Table view of students',
      props: { students: GALLERY_STUDENTS.slice(0, 5) },
      status: 'prod',
      category: 'variant',
    },
  ],
}
