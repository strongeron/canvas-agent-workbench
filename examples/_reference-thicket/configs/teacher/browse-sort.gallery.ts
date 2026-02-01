import type { BrowseSortProps } from '@/components/browse-sort'

import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

export const browseSortMeta: GalleryComponentMeta = {
  id: 'teacher/browse-sort',
  sourceId: '@/components/browse-sort#BrowseSort',
  status: 'prod',
}

export const browseSortGalleryEntry: GalleryEntry<BrowseSortProps> = {
  id: browseSortMeta.id,
  name: 'BrowseSort',
  importPath: browseSortMeta.sourceId.split('#')[0],
  category: 'Filtering & Sorting',
  layoutSize: 'full',
  meta: browseSortMeta,
  variants: [
    {
      name: 'Newest First',
      description: 'Sort dropdown with "Newest First" selected',
      props: { sortOrder: 'newest', onSortChange: () => {} },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Oldest First',
      description: 'Sort dropdown with "Oldest First" selected',
      props: { sortOrder: 'oldest', onSortChange: () => {} },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Published First',
      description: 'Sort dropdown with "Published First" selected',
      props: { sortOrder: 'published', onSortChange: () => {} },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Lowest Price',
      description: 'Sort dropdown with "Lowest Price" selected',
      props: { sortOrder: 'price_low', onSortChange: () => {} },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Highest Price',
      description: 'Sort dropdown with "Highest Price" selected',
      props: { sortOrder: 'price_high', onSortChange: () => {} },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Shortest Courses',
      description: 'Sort dropdown with "Shortest Courses" selected',
      props: { sortOrder: 'shortest', onSortChange: () => {} },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Longest Courses',
      description: 'Sort dropdown with "Longest Courses" selected',
      props: { sortOrder: 'longest', onSortChange: () => {} },
      status: 'prod',
      category: 'state',
    },
  ],
}
