import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import type { ViewToggle } from '@thicket/platform/ViewToggle'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type ViewToggleProps = ComponentProps<typeof ViewToggle>

/**
 * ViewToggle - switches between card and table view modes.
 * Used in course lists and student management interfaces.
 */
const viewToggleMeta: GalleryComponentMeta = {
    id: 'platform/view-toggle',
  sourceId: '@thicket/platform/ViewToggle#ViewToggle',
  status: 'archive',
}

export const viewToggleGalleryEntry: GalleryEntry<ViewToggleProps> = {
  name: 'ViewToggle',
  importPath: viewToggleMeta.sourceId.split('#')[0],
  category: 'Navigation & Controls',
  id: 'platform/view-toggle',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Card View Selected',
      description: 'Toggle with card view active',
      props: { view: 'card', onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Table View Selected',
      description: 'Toggle with table view active',
      props: { view: 'table', onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
  ],
}
