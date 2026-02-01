import type { ImageUploadZoneProps } from '@/platform/components/CourseBuilder/ImageUploadZone'

import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

export const imageUploadZoneMeta: GalleryComponentMeta = {
  id: 'teacher/image-upload-zone',
  sourceId: '@/platform/components/CourseBuilder/ImageUploadZone#ImageUploadZone',
  status: 'prod',
}

export const imageUploadZoneGalleryEntry: GalleryEntry<ImageUploadZoneProps> = {
  id: imageUploadZoneMeta.id,
  name: 'ImageUploadZone',
  importPath: imageUploadZoneMeta.sourceId.split('#')[0],
  category: 'Course Management',
  layoutSize: 'medium',
  meta: imageUploadZoneMeta,
  variants: [
    {
      name: 'Empty',
      description: 'Upload zone with no image',
      props: { label: 'Course Cover Image', onUpload: () => {} },
      status: 'prod',
      category: 'state',
    },
  ],
}
