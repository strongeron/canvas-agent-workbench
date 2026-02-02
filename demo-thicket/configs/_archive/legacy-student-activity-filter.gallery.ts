import type { ComponentProps } from 'react'

import type { StudentActivityFilter } from '@thicket/platform/_archive/StudentActivityFilter'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'

type StudentActivityFilterProps = ComponentProps<typeof StudentActivityFilter>

const legacyStudentActivityFilterMeta: GalleryComponentMeta = {
  id: '_archive/legacy-student-activity-filter',
  sourceId: '@thicket/platform/_archive/StudentActivityFilter#StudentActivityFilter',
  status: 'archive',
}

export const legacyStudentActivityFilterGalleryEntry: GalleryEntry<StudentActivityFilterProps> = {
  name: 'StudentActivityFilter (Legacy)',
  importPath: legacyStudentActivityFilterMeta.sourceId.split('#')[0],
  category: 'Archive',
  id: legacyStudentActivityFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: legacyStudentActivityFilterMeta,
  variants: [
    {
      name: 'All Students (Default)',
      description: 'Legacy StudentActivityFilter using FilterButton - no filter applied',
      props: {
        value: 'all' as const,
        onChange: () => {},
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Active Students Only',
      description: 'Legacy StudentActivityFilter filtered to active students',
      props: {
        value: 'active' as const,
        onChange: () => {},
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Inactive Students Only',
      description: 'Legacy StudentActivityFilter filtered to inactive students',
      props: {
        value: 'inactive' as const,
        onChange: () => {},
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
