import type { StripeSuccessBanner } from "@/platform/components/StripeSuccessBanner"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

type StripeSuccessBannerProps = React.ComponentProps<typeof StripeSuccessBanner>

const stripeSuccessBannerMeta: GalleryComponentMeta = {
    id: 'platform/stripe-success-banner',
  sourceId: '@/platform/components/StripeSuccessBanner#StripeSuccessBanner',
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
