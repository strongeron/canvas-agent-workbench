import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import type { CourseFilters } from '@thicket/platform/CourseFilters'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type CourseFiltersProps = ComponentProps<typeof CourseFilters>

/**
 * CourseFilters - filtering and sorting controls for course lists.
 * Allows filtering by status and sorting by date.
 */
const courseFiltersMeta: GalleryComponentMeta = {
    id: 'platform/course-filters',
  sourceId: '@thicket/platform/CourseFilters#CourseFilters',
  status: 'archive',
}

export const courseFiltersGalleryEntry: GalleryEntry<CourseFiltersProps> = {
  name: 'CourseFilters',
  importPath: courseFiltersMeta.sourceId.split('#')[0],
  category: 'Navigation & Controls',
  id: 'platform/course-filters',
  layoutSize: 'full',
  variants: [
    {
      name: 'No Filters Active',
      description: 'Default state with no filters selected',
      props: { onFilterChange: () => {}, onSortChange: () => {}, activeFilters: [], sortOrder: 'newest' as const },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'With Active Filters',
      description: 'Multiple status filters applied',
      props: { onFilterChange: () => {}, onSortChange: () => {}, activeFilters: ['published' as const, 'waitlist' as const], sortOrder: 'newest' as const },
      status: 'archive',
      category: 'state',
    },
  ],
}
