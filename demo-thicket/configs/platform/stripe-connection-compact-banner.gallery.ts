import type { StripeConnectionCompactBanner } from "@thicket/platform/StripeConnectionCompactBanner"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type StripeConnectionCompactBannerProps = React.ComponentProps<typeof StripeConnectionCompactBanner>

export const stripeConnectionCompactBannerMeta: GalleryComponentMeta = {
  id: 'platform/stripe-connection-compact-banner',
  sourceId: '@thicket/platform/StripeConnectionCompactBanner#StripeConnectionCompactBanner',
  status: 'prod',
}

export const stripeConnectionCompactBannerGalleryEntry: GalleryEntry<StripeConnectionCompactBannerProps> = {
  name: 'StripeConnectionCompactBanner',
  importPath: stripeConnectionCompactBannerMeta.sourceId.split('#')[0],
  category: 'Platform Shared',
  id: stripeConnectionCompactBannerMeta.id,
  layoutSize: 'full',
  meta: stripeConnectionCompactBannerMeta,
  variants: [
    {
      name: 'Default Compact Banner',
      description: 'Compact version of Stripe connection prompt',
      props: {
        onConnect: () => console.log('Connect clicked'),
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
