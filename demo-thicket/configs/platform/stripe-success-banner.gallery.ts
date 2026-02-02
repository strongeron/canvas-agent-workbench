import type { StripeSuccessBanner } from "../../platform/StripeSuccessBanner"
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { GalleryComponentMeta } from '../../platform/gallery/types'

type StripeSuccessBannerProps = React.ComponentProps<typeof StripeSuccessBanner>

const stripeSuccessBannerMeta: GalleryComponentMeta = {
    id: 'platform/stripe-success-banner',
  sourceId: '../../platform/StripeSuccessBanner#StripeSuccessBanner',
  status: 'archive',
}

export const stripeSuccessBannerGalleryEntry: GalleryEntry<StripeSuccessBannerProps> = {
  name: 'StripeSuccessBanner',
  importPath: stripeSuccessBannerMeta.sourceId.split('#')[0],
  category: 'Notifications & Feedback',
  id: 'platform/stripe-success-banner',
  layoutSize: 'full',
  variants: [
    {
      name: 'Success Banner',
      description: 'Celebration banner shown after successful Stripe connection',
      props: {
        onDismiss: () => console.log('Dismissed'),
        onOpenDashboard: () => console.log('Open dashboard'),
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
