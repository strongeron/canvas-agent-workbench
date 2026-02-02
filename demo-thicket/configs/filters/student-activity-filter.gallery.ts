import type { ComponentProps } from 'react'

import type { StudentActivityFilter } from '../../platform/filters/StudentActivityFilter'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../platform/gallery/registry/types'

type StudentActivityFilterProps = ComponentProps<typeof StudentActivityFilter>

const studentActivityFilterMeta: GalleryComponentMeta = {
  id: 'filters/student-activity-filter',
  sourceId: '../../platform/filters/StudentActivityFilter#StudentActivityFilter',
  status: 'archive',
}

export const studentActivityFilterGalleryEntry: GalleryEntry<StudentActivityFilterProps> = {
  name: 'StudentActivityFilter',
  importPath: studentActivityFilterMeta.sourceId.split('#')[0],
  category: 'Filtering & Sorting',
  id: studentActivityFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: studentActivityFilterMeta,
  variants: [
    {
      name: 'All Students (Default)',
      description: 'No filter applied, shows all students',
      props: {
        value: 'all' as const,
        onChange: () => {},
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Active Students Only',
      description: 'Filtered to show only active students (last 7 days)',
      props: {
        value: 'active' as const,
        onChange: () => {},
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Inactive Students Only',
      description: 'Filtered to show only inactive students',
      props: {
        value: 'inactive' as const,
        onChange: () => {},
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
