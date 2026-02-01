import type { ComponentProps } from 'react'

import type { PriceFilter } from '@/components/price-filter'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

type PriceFilterProps = ComponentProps<typeof PriceFilter>

export const priceFilterMeta: GalleryComponentMeta = {
  id: 'public/price-filter',
  sourceId: '@/components/price-filter#PriceFilter',
  status: 'prod',
}

export const priceFilterGalleryEntry: GalleryEntry<PriceFilterProps> = {
  name: 'PriceFilter',
  importPath: priceFilterMeta.sourceId.split('#')[0],
  category: 'Public Components',
  id: priceFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: priceFilterMeta,
  variants: [
    {
      name: 'Default State',
      description: 'Price range filter with presets and custom range input. Requires Inertia page context.',
      status: 'prod',
      category: 'information',
      props: {
        __skipRender: true,
      },
    },
  ],
}
