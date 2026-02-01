import type { ImagePlaceholderProps } from "@/components/ui/image-placeholder"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

const imagePlaceholderMeta: GalleryComponentMeta = {
    id: 'ui/image-placeholder',
  sourceId: '@/components/ui/image-placeholder#ImagePlaceholderProps',
  status: 'archive',
}

export const imagePlaceholderGalleryEntry: GalleryEntry<ImagePlaceholderProps> = {
  name: 'ImagePlaceholder',
  importPath: imagePlaceholderMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/image-placeholder',
  layoutSize: 'small',
  variants: [
    {
      name: 'Default',
      description: 'Placeholder for missing images',
      props: { className: 'w-full h-48' },
      status: 'archive',
      category: 'variant',
    },
  ],
}
