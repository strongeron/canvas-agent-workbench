import type { WherebyEmbedProps } from '@thicket/platform/Student/WherebyEmbed'

import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export const wherebyEmbedMeta: GalleryComponentMeta = {
  id: 'student/whereby-embed',
  sourceId: '@thicket/platform/Student/WherebyEmbed#WherebyEmbed',
  status: 'prod',
}

export const wherebyEmbedGalleryEntry: GalleryEntry<WherebyEmbedProps> = {
  id: wherebyEmbedMeta.id,
  name: 'WherebyEmbed',
  importPath: wherebyEmbedMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'large',
  meta: wherebyEmbedMeta,
  variants: [
    {
      name: 'Video Room',
      description: 'Embedded Whereby video room',
      props: {
        roomUrl: 'https://whereby.com/demo-room',
        displayName: 'Student Name',
        onLeave: () => {},
        onReady: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
