import type { WherebyRecordingEmbedProps } from '@thicket/platform/Student/WherebyRecordingEmbed'

import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export const wherebyRecordingEmbedMeta: GalleryComponentMeta = {
  id: 'student/whereby-recording-embed',
  sourceId: '@thicket/platform/Student/WherebyRecordingEmbed#WherebyRecordingEmbed',
  status: 'prod',
}

export const wherebyRecordingEmbedGalleryEntry: GalleryEntry<WherebyRecordingEmbedProps> = {
  id: wherebyRecordingEmbedMeta.id,
  name: 'WherebyRecordingEmbed',
  importPath: wherebyRecordingEmbedMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'large',
  meta: wherebyRecordingEmbedMeta,
  variants: [
    {
      name: 'Recording Player',
      description: 'Embedded recording player',
      props: {
        recordingUrl: 'https://whereby.com/recording/demo',
        lessonTitle: 'Introduction to Renaissance Art',
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
