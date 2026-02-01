import type { ComponentProps } from 'react'

import { PublishCourseModal } from '@/platform/components/PublishCourseModal'
import type { GalleryComponentMeta } from '../registry/types'
import { GALLERY_COURSES } from "../mocks/galleryData"
import type { GalleryEntry } from "../registry/types"

type PublishCourseModalProps = ComponentProps<typeof PublishCourseModal>

export { PublishCourseModal }

export const publishCourseModalMeta: GalleryComponentMeta = {
  id: 'modals/publish-course-modal',
  sourceId: '@/platform/components/PublishCourseModal#PublishCourseModal',
  status: 'prod',
}

/**
 * PublishCourseModal - status selection dialog for publishing courses.
 * Allows choosing between draft, waitlist, and published states.
 */
export const publishCourseModalGalleryEntry: GalleryEntry<PublishCourseModalProps> = {
  name: 'PublishCourseModal',
  importPath: publishCourseModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: publishCourseModalMeta.id,
  layoutSize: 'medium',
  meta: publishCourseModalMeta,
  variants: [
    {
      name: 'Publish Draft Course',
      description: 'Modal to publish a draft course with status selection',
      props: { course: GALLERY_COURSES[0], isOpen: true, onClose: () => {} },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Update Published Course',
      description: 'Modal to update a published course with enrollment warning',
      props: { 
        course: { ...GALLERY_COURSES[0], state: 'published' }, 
        isOpen: true, 
        onClose: () => {} 
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
