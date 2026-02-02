import { RescheduleModal, type RescheduleModalProps } from '@thicket/platform/Teacher/RescheduleModal'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import { GALLERY_COURSES } from '@thicket/platform/gallery/mocks/galleryData'
import type { GalleryEntry } from '../../registry/types'

export { RescheduleModal }

const rescheduleModalMeta: GalleryComponentMeta = {
    id: 'teacher/reschedule-modal',
  sourceId: '@thicket/platform/Teacher/RescheduleModal#RescheduleModalProps',
  status: 'archive',
}

export const rescheduleModalGalleryEntry: GalleryEntry<RescheduleModalProps> = {
  id: 'teacher/reschedule-modal',
  name: 'RescheduleModal',
  importPath: rescheduleModalMeta.sourceId.split('#')[0],
  category: 'Teacher Schedule Management',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Reschedule Lesson',
      description: 'Modal to reschedule a lesson',
      props: {
        lesson: {
          id: 1,
          courseId: 1,
          courseTitle: GALLERY_COURSES[0].title,
          lessonId: 2,
          lessonTitle: 'Gothic Architecture Basics',
          lessonDescription: 'Introduction to Gothic elements',
          lessonPosition: 2,
          scheduledAt: '2025-11-15T14:00:00Z',
        },
        onClose: () => {},
        onConfirm: () => {},
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
