import { EnrollmentSuccessModal, type EnrollmentSuccessModalProps } from '@/platform/components/Student/EnrollmentSuccessModal'

import { GALLERY_COURSES } from '../mocks/galleryData'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

export { EnrollmentSuccessModal }

export const enrollmentSuccessModalMeta: GalleryComponentMeta = {
  id: 'student/enrollment-success-modal',
  sourceId: '@/platform/components/Student/EnrollmentSuccessModal#EnrollmentSuccessModal',
  status: 'prod',
}

export const enrollmentSuccessModalGalleryEntry: GalleryEntry<EnrollmentSuccessModalProps> = {
  id: enrollmentSuccessModalMeta.id,
  name: 'EnrollmentSuccessModal',
  importPath: enrollmentSuccessModalMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'medium',
  meta: enrollmentSuccessModalMeta,
  variants: [
    {
      name: 'Success Message',
      description: 'Modal confirming enrollment with course info and navigation options',
      props: {
        course: GALLERY_COURSES[0],
        onClose: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
