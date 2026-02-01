import { Filter } from 'lucide-react'

import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

interface FilterButtonGalleryProps {
  icon: typeof Filter
  label: string
  value: string | number | null
  options: { value: string | number; label: string }[]
  onChange: (value: string | number | null) => void
  allLabel?: string
  clearLabel?: string
}

const filterButtonMeta: GalleryComponentMeta = {
  id: '_archive/filter-button',
  sourceId: '@/platform/components/_archive/FilterButton#FilterButton',
  status: 'archive',
}

export const filterButtonGalleryEntry: GalleryEntry<FilterButtonGalleryProps> = {
  name: 'FilterButton (Legacy)',
  importPath: filterButtonMeta.sourceId.split('#')[0],
  category: 'Archive',
  id: filterButtonMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: filterButtonMeta,
  variants: [
    {
      name: 'Default State',
      description: 'Legacy filter button with no selection',
      props: {
        icon: Filter,
        label: 'Filter',
        value: null,
        options: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
          { value: 'option3', label: 'Option 3' },
        ],
        onChange: () => {},
        allLabel: 'All Items',
        clearLabel: 'Clear Filter',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Selection',
      description: 'Legacy filter button with active selection',
      props: {
        icon: Filter,
        label: 'Filter',
        value: 'option1',
        options: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
        ],
        onChange: () => {},
        allLabel: 'All Items',
        clearLabel: 'Clear Filter',
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
