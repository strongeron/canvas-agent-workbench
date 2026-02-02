import type { ComponentProps } from 'react'

import type { StudentTableView } from '../../platform/StudentTableView'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import { GALLERY_STUDENTS } from "../../platform/gallery/mocks/galleryData"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

type StudentTableViewProps = ComponentProps<typeof StudentTableView>

export const studentTableViewMeta: GalleryComponentMeta = {
  id: 'platform/student-table-view',
  sourceId: '../../platform/StudentTableView#StudentTableView',
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
