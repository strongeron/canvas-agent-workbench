import { StripeCheckoutModal, type StripeCheckoutModalProps } from '@/platform/components/Student/StripeCheckoutModal'

import { GALLERY_COURSES, GALLERY_INSTRUCTORS } from '../mocks/galleryData'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

export { StripeCheckoutModal }

export const stripeCheckoutModalMeta: GalleryComponentMeta = {
  id: 'student/stripe-checkout-modal',
  sourceId: '@/platform/components/Student/StripeCheckoutModal#StripeCheckoutModal',
  status: 'prod',
}

export const stripeCheckoutModalGalleryEntry: GalleryEntry<StripeCheckoutModalProps> = {
  id: stripeCheckoutModalMeta.id,
  name: 'StripeCheckoutModal',
  importPath: stripeCheckoutModalMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'medium',
  meta: stripeCheckoutModalMeta,
  variants: [
    {
      name: 'Checkout Flow',
      description: 'Modal for course payment',
      props: {
        course: { ...GALLERY_COURSES[0], instructor: GALLERY_INSTRUCTORS[0] },
        onClose: () => {},
        studentId: 1,
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
