import type { ShowMoreButtonProps } from "../../components/ui/show-more-button"
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from "../../platform/gallery/registry/types"

export const showMoreButtonMeta: GalleryComponentMeta = {
  id: 'ui/show-more-button',
  sourceId: '../../components/ui/show-more-button#ShowMoreButton',
  status: 'prod',
}

export const showMoreButtonGalleryEntry: GalleryEntry<ShowMoreButtonProps> = {
  name: 'ShowMoreButton',
  importPath: showMoreButtonMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: showMoreButtonMeta.id,
  layoutSize: 'small',
  meta: showMoreButtonMeta,
  variants: [
    {
      name: 'Show More',
      description: 'Button to expand content',
      props: { isExpanded: false, onClick: () => {} },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Show Less',
      description: 'Button to collapse content',
      props: { isExpanded: true, onClick: () => {} },
      status: 'archive',
      category: 'state',
    },
  ],
}
