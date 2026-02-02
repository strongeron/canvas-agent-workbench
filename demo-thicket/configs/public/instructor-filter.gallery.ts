import type { ComponentProps } from 'react'

import type { InstructorFilter } from '@thicket/components/instructor-filter'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'

type InstructorFilterProps = ComponentProps<typeof InstructorFilter>

export const instructorFilterMeta: GalleryComponentMeta = {
  id: 'public/instructor-filter',
  sourceId: '@thicket/components/instructor-filter#InstructorFilter',
  status: 'prod',
}

export const instructorFilterGalleryEntry: GalleryEntry<InstructorFilterProps> = {
  name: 'InstructorFilter',
  importPath: instructorFilterMeta.sourceId.split('#')[0],
  category: 'Public Components',
  id: instructorFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: instructorFilterMeta,
  variants: [
    {
      name: 'Default State',
      description: 'Instructor filter dropdown with avatar display. Requires Inertia page context.',
      status: 'prod',
      category: 'information',
      props: {
        __skipRender: true,
      },
    },
  ],
}
