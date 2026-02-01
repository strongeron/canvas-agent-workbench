import { CourseLockModal } from '@/platform/components/CourseLockModal'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"

type CourseLockModalProps = React.ComponentProps<typeof CourseLockModal>

export { CourseLockModal }

export const courseLockModalMeta: GalleryComponentMeta = {
  id: 'platform/course-lock-modal',
  sourceId: '@/platform/components/CourseLockModal#CourseLockModal',
  status: 'prod',
}

export const courseLockModalGalleryEntry: GalleryEntry<CourseLockModalProps> = {
  name: 'CourseLockModal',
  importPath: courseLockModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: courseLockModalMeta.id,
  layoutSize: 'medium',
  meta: courseLockModalMeta,
  variants: [
    {
      name: 'In Review',
      description: 'Course is under admin review and cannot be edited',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        reason: 'in_review',
        courseName: 'Advanced React Development',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Has Enrollments',
      description: 'Course has active students and cannot be edited',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        reason: 'has_enrollments',
        courseName: 'Introduction to Web Development',
        onCreateVersion: () => console.log('Create new version'),
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
