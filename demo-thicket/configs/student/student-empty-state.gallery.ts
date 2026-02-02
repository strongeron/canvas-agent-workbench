import type { StudentEmptyStateProps } from '../../platform/Student/StudentEmptyState'
import type { GalleryComponentMeta } from '../../platform/gallery/types'

import type { GalleryEntry } from '../../registry/types'

const studentEmptyStateMeta: GalleryComponentMeta = {
    id: 'student/student-empty-state',
  sourceId: '../../platform/Student/StudentEmptyState#StudentEmptyStateProps',
  status: 'archive',
}

export const studentEmptyStateGalleryEntry: GalleryEntry<StudentEmptyStateProps> = {
  id: 'student/student-empty-state',
  name: 'StudentEmptyState',
  importPath: studentEmptyStateMeta.sourceId.split('#')[0],
  category: 'Student Experience',
  layoutSize: 'large',
  variants: [
    {
      name: 'No Courses',
      description: 'Empty state for student with no courses',
      props: { studentName: 'Alex', studentId: 1 },
      status: 'archive',
      category: 'variant',
    },
  ],
}
