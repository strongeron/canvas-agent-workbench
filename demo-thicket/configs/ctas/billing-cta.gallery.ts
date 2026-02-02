import type { BillingCTAProps } from '../../platform/CTAs/BillingCTA'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

const samplePlan = {
  id: 1,
  name: 'Pro',
  price: 29.99,
}

export const billingCTAMeta: GalleryComponentMeta = {
  id: 'ctas/billing-cta',
  sourceId: '../../platform/CTAs/BillingCTA#BillingCTA',
  status: 'wip',
}

export const billingCTAGalleryEntry: GalleryEntry<BillingCTAProps> = {
  id: billingCTAMeta.id,
  name: 'BillingCTA',
  importPath: billingCTAMeta.sourceId.split('#')[0],
  category: 'Domain CTAs',
  layoutSize: 'small',
  meta: billingCTAMeta,
  variants: [
    {
      name: 'Upgrade Plan',
      description: 'Upgrade to a higher tier plan',
      props: {
        plan: samplePlan,
        status: 'active' as const,
        action: 'upgrade' as const,
        onUpgrade: () => {},
      },
      status: 'wip',
      category: 'upgrade',
    },
    {
      name: 'Subscribe',
      description: 'Subscribe to a plan',
      props: {
        plan: samplePlan,
        status: 'inactive' as const,
        action: 'subscribe' as const,
        onSubscribe: () => {},
      },
      status: 'wip',
      category: 'subscribe',
    },
    {
      name: 'Manage Subscription',
      description: 'Manage existing subscription',
      props: {
        plan: samplePlan,
        status: 'active' as const,
        action: 'manage' as const,
        onManage: () => {},
      },
      status: 'wip',
      category: 'manage',
    },
    {
      name: 'Connect Stripe',
      description: 'Connect Stripe account',
      props: {
        action: 'connect-stripe' as const,
        onConnectStripe: () => {},
      },
      status: 'wip',
      category: 'stripe',
    },
  ],
}

