import type { ComponentProps } from 'react'

import { StripeConnectModal } from '@/platform/components/StripeConnectModal'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"

type StripeConnectModalProps = ComponentProps<typeof StripeConnectModal>

export { StripeConnectModal }

export const stripeConnectModalMeta: GalleryComponentMeta = {
  id: 'modals/stripe-connect-modal',
  sourceId: '@/platform/components/StripeConnectModal#StripeConnectModal',
  status: 'prod',
}

/**
 * StripeConnectModal - detailed modal explaining Stripe Connect benefits.
 * Initiates payment processing setup flow.
 */
export const stripeConnectModalGalleryEntry: GalleryEntry<StripeConnectModalProps> = {
  name: 'StripeConnectModal',
  importPath: stripeConnectModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: stripeConnectModalMeta.id,
  layoutSize: 'medium',
  meta: stripeConnectModalMeta,
  variants: [
    {
      name: 'Connect Stripe',
      description: 'Modal to connect Stripe account',
      props: { isOpen: true, onClose: () => {}, instructorId: 90001 },
      status: 'prod',
      category: 'variant',
    },
  ],
}
