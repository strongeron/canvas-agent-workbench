import { StripeCheckoutModal, type StripeCheckoutModalProps } from '@thicket/platform/Student/StripeCheckoutModal'

import { GALLERY_COURSES, GALLERY_INSTRUCTORS } from '@thicket/platform/gallery/mocks/galleryData'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export { StripeCheckoutModal }

export const stripeCheckoutModalMeta: GalleryComponentMeta = {
  id: 'student/stripe-checkout-modal',
  sourceId: '@thicket/platform/Student/StripeCheckoutModal#StripeCheckoutModal',
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
