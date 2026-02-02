import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../platform/gallery/registry/types'

interface DayOfWeekFilterProps {
  variant?: 'dropdown' | 'horizontal'
  categories?: never
  currentCategoryId?: never
  onCategoryChange?: never
}

export const dayOfWeekFilterMeta: GalleryComponentMeta = {
  id: 'filters/day-of-week-filter',
  sourceId: '../../components/day-of-week-filter#DayOfWeekFilter',
  status: 'prod',
}

export const dayOfWeekFilterGalleryEntry: GalleryEntry<DayOfWeekFilterProps> = {
  name: 'DayOfWeekFilter',
  importPath: dayOfWeekFilterMeta.sourceId.split('#')[0],
  category: 'Filtering & Sorting',
  id: dayOfWeekFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: dayOfWeekFilterMeta,
  variants: [
    {
      name: 'Default State (Inertia)',
      description: 'Uses Inertia router, renders with shared constants',
      props: {
        __skipRender: true,
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
