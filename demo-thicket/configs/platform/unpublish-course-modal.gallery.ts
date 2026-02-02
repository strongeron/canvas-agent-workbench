import { UnpublishCourseModal, type UnpublishCourseModalProps } from '@thicket/platform/UnpublishCourseModal'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import { GALLERY_COURSES } from "@thicket/platform/gallery/mocks/galleryData"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export { UnpublishCourseModal }

export const unpublishCourseModalMeta: GalleryComponentMeta = {
  id: 'platform/unpublish-course-modal',
  sourceId: '@thicket/platform/UnpublishCourseModal#UnpublishCourseModal',
  status: 'prod',
}

export const unpublishCourseModalGalleryEntry: GalleryEntry<UnpublishCourseModalProps> = {
  name: 'UnpublishCourseModal (Platform)',
  importPath: unpublishCourseModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: unpublishCourseModalMeta.id,
  layoutSize: 'medium',
  meta: unpublishCourseModalMeta,
  variants: [
    {
      name: 'Unpublish Course',
      description: 'Confirmation modal for unpublishing a course',
      props: {
        course: GALLERY_COURSES[0],
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm unpublish'),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Long Course Title',
      description: 'Modal with long course title to test wrapping',
      props: {
        course: { ...GALLERY_COURSES[0], title: 'Advanced Full-Stack Web Development with React, TypeScript, Node.js, and PostgreSQL' },
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm unpublish'),
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
