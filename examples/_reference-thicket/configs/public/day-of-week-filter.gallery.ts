import type { ComponentProps } from 'react'

import type { DayOfWeekFilter } from '@/components/day-of-week-filter'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

type DayOfWeekFilterProps = ComponentProps<typeof DayOfWeekFilter>

export const publicDayOfWeekFilterMeta: GalleryComponentMeta = {
  id: 'public/day-of-week-filter',
  sourceId: '@/components/day-of-week-filter#DayOfWeekFilter',
  status: 'prod',
}

export const dayOfWeekFilterGalleryEntry: GalleryEntry<DayOfWeekFilterProps> = {
  name: 'DayOfWeekFilter',
  importPath: publicDayOfWeekFilterMeta.sourceId.split('#')[0],
  category: 'Public Components',
  id: publicDayOfWeekFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: publicDayOfWeekFilterMeta,
  variants: [
    {
      name: 'Default State',
      description: 'Day of week filter dropdown for course scheduling. Requires Inertia page context.',
      status: 'archive',
      category: 'information',
      props: {
        __skipRender: true,
      },
    },
  ],
}
