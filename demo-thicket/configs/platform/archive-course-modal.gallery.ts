import type { ComponentProps } from 'react'

import { ArchiveCourseModal } from '@thicket/platform/ArchiveCourseModal'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import { GALLERY_COURSES } from "@thicket/platform/gallery/mocks/galleryData"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type ArchiveCourseModalProps = ComponentProps<typeof ArchiveCourseModal>

export { ArchiveCourseModal }

export const archiveCourseModalMeta: GalleryComponentMeta = {
  id: 'platform/archive-course-modal',
  sourceId: '@thicket/platform/ArchiveCourseModal#ArchiveCourseModal',
  status: 'prod',
}

/**
 * ArchiveCourseModal - confirmation dialog for archiving courses.
 * Explains consequences and requires explicit confirmation.
 */
export const archiveCourseModalGalleryEntry: GalleryEntry<ArchiveCourseModalProps> = {
  name: 'ArchiveCourseModal',
  importPath: archiveCourseModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: archiveCourseModalMeta.id,
  layoutSize: 'medium',
  meta: archiveCourseModalMeta,
  variants: [
    {
      name: 'Archive Confirmation',
      description: 'Modal to confirm course archiving',
      props: { course: GALLERY_COURSES[0], isOpen: true, onClose: () => {}, onConfirm: () => {} },
      status: 'prod',
      category: 'variant',
    },
  ],
}
