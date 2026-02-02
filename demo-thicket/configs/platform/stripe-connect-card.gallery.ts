import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '../../platform/gallery/types'

import type { StripeConnectCard } from '../../platform/StripeConnectCard'
import type { GalleryEntry } from "../../platform/gallery/registry/types"

type StripeConnectCardProps = ComponentProps<typeof StripeConnectCard>

/**
 * StripeConnectCard - onboarding card for connecting Stripe payment processing.
 * Used in teacher onboarding flow and settings.
 */
const stripeConnectCardMeta: GalleryComponentMeta = {
    id: 'platform/stripe-connect-card',
  sourceId: '../../platform/StripeConnectCard#StripeConnectCard',
  status: 'archive',
}

export const stripeConnectCardGalleryEntry: GalleryEntry<StripeConnectCardProps> = {
  name: 'StripeConnectCard',
  importPath: stripeConnectCardMeta.sourceId.split('#')[0],
  category: 'Cards & Display',
  id: 'platform/stripe-connect-card',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Not Connected',
      description: 'Card prompting Stripe connection',
      props: { isCompleted: false, onConnect: () => {} },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Connected',
      description: 'Card showing successful connection',
      props: { isCompleted: true, onConnect: () => {} },
      status: 'archive',
      category: 'state',
    },
  ],
}
