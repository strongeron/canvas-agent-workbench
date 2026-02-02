import type { ComponentProps } from 'react'

import type { CategoryFilter } from '@thicket/components/category-filter'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'

import { GALLERY_CATEGORIES } from '@thicket/platform/gallery/mocks/galleryData'

type CategoryFilterProps = ComponentProps<typeof CategoryFilter>

export const categoryFilterMeta: GalleryComponentMeta = {
  id: 'public/category-filter',
  sourceId: '@thicket/components/category-filter#CategoryFilter',
  status: 'prod',
}

export const categoryFilterGalleryEntry: GalleryEntry<CategoryFilterProps> = {
  name: 'CategoryFilter',
  importPath: categoryFilterMeta.sourceId.split('#')[0],
  category: 'Public Components',
  id: categoryFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: categoryFilterMeta,
  variants: [
    {
      name: 'Horizontal - All Selected',
      description: 'Landing page horizontal pills with All categories button selected',
      status: 'prod',
      category: 'variant',
      props: {
        variant: 'horizontal',
        categories: GALLERY_CATEGORIES,
        currentCategoryId: null,
        onCategoryChange: () => {},
      },
    },
    {
      name: 'Horizontal - Architecture Selected',
      description: 'Horizontal pills with Architecture category selected',
      status: 'archive',
      category: 'state',
      props: {
        variant: 'horizontal',
        categories: GALLERY_CATEGORIES,
        currentCategoryId: 90001,
        onCategoryChange: () => {},
      },
    },
    {
      name: 'Horizontal - Philosophy Selected',
      description: 'Horizontal pills with Philosophy category selected',
      status: 'archive',
      category: 'state',
      props: {
        variant: 'horizontal',
        categories: GALLERY_CATEGORIES,
        currentCategoryId: 90005,
        onCategoryChange: () => {},
      },
    },
    {
      name: 'Horizontal - Film & Media Selected',
      description: 'Horizontal pills with Film & Media category selected showing film icon',
      status: 'archive',
      category: 'state',
      props: {
        variant: 'horizontal',
        categories: GALLERY_CATEGORIES,
        currentCategoryId: 90007,
        onCategoryChange: () => {},
      },
    },
    {
      name: 'Horizontal - Few Categories',
      description: 'Horizontal pills with only 3 categories',
      status: 'archive',
      category: 'layout',
      props: {
        variant: 'horizontal',
        categories: GALLERY_CATEGORIES.slice(0, 3),
        currentCategoryId: null,
        onCategoryChange: () => {},
      },
    },
    {
      name: 'Horizontal - Many Categories (Scrollable)',
      description: 'Horizontal pills with 7+ categories demonstrating scroll behavior',
      status: 'archive',
      category: 'layout',
      props: {
        variant: 'horizontal',
        categories: GALLERY_CATEGORIES,
        currentCategoryId: 90004,
        onCategoryChange: () => {},
      },
    },
    {
      name: 'Dropdown - Information',
      description: 'Dropdown variant used in platform pages. Requires Inertia page context to render.',
      status: 'archive',
      category: 'information',
      props: {
        variant: 'dropdown',
        __skipRender: true,
      },
    },
  ],
}
