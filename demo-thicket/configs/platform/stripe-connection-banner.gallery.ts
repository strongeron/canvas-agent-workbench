import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import type { StripeConnectionBanner } from '@thicket/platform/StripeConnectionBanner'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type StripeConnectionBannerProps = ComponentProps<typeof StripeConnectionBanner>

/**
 * StripeConnectionBanner - prominent banner prompting Stripe account setup.
 * Displayed to teachers who haven't connected payment processing.
 */
const stripeConnectionBannerMeta: GalleryComponentMeta = {
    id: 'platform/stripe-connection-banner',
  sourceId: '@thicket/platform/StripeConnectionBanner#StripeConnectionBanner',
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
