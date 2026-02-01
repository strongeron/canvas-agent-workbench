import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '../registry/types'

import type { StripeConnectionBanner } from '@/platform/components/StripeConnectionBanner'
import type { GalleryEntry } from "../registry/types"

type StripeConnectionBannerProps = ComponentProps<typeof StripeConnectionBanner>

/**
 * StripeConnectionBanner - prominent banner prompting Stripe account setup.
 * Displayed to teachers who haven't connected payment processing.
 */
const stripeConnectionBannerMeta: GalleryComponentMeta = {
    id: 'platform/stripe-connection-banner',
  sourceId: '@/platform/components/StripeConnectionBanner#StripeConnectionBanner',
  status: 'archive',
}

export const stripeConnectionBannerGalleryEntry: GalleryEntry<StripeConnectionBannerProps> = {
  name: 'StripeConnectionBanner',
  importPath: stripeConnectionBannerMeta.sourceId.split('#')[0],
  category: 'Notifications & Feedback',
  id: 'platform/stripe-connection-banner',
  layoutSize: 'full',
  variants: [
    {
      name: 'Default',
      description: 'Stripe connection prompt banner',
      props: { onConnect: () => {} },
      status: 'archive',
      category: 'variant',
    },
  ],
}
