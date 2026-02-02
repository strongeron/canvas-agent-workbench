import type { TransactionStatusBadge } from "../../components/ui/transaction-status-badge"
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from "../../platform/gallery/registry/types"

type TransactionStatusBadgeProps = React.ComponentProps<typeof TransactionStatusBadge>

export const transactionStatusBadgeMeta: GalleryComponentMeta = {
  id: 'ui/transaction-status-badge',
  sourceId: '../../components/ui/transaction-status-badge#TransactionStatusBadge',
  status: 'prod',
}

export const transactionStatusBadgeGalleryEntry: GalleryEntry<TransactionStatusBadgeProps> = {
  name: 'TransactionStatusBadge',
  importPath: transactionStatusBadgeMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: transactionStatusBadgeMeta.id,
  layoutSize: 'small',
  meta: transactionStatusBadgeMeta,
  variants: [
    {
      name: 'Succeeded (Small)',
      description: 'Success status badge in small size',
      props: {
        status: 'succeeded',
        size: 'sm',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Succeeded (Medium)',
      description: 'Success status badge in medium size',
      props: {
        status: 'succeeded',
        size: 'md',
      },
      status: 'prod',
      category: 'size',
    },
    {
      name: 'Pending (Small)',
      description: 'Pending status badge in small size',
      props: {
        status: 'pending',
        size: 'sm',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Pending (Medium)',
      description: 'Pending status badge in medium size',
      props: {
        status: 'pending',
        size: 'md',
      },
      status: 'prod',
      category: 'size',
    },
    {
      name: 'Failed (Small)',
      description: 'Failed status badge in small size',
      props: {
        status: 'failed',
        size: 'sm',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Failed (Medium)',
      description: 'Failed status badge in medium size',
      props: {
        status: 'failed',
        size: 'md',
      },
      status: 'prod',
      category: 'size',
    },
    {
      name: 'Refunded (Small)',
      description: 'Refunded status badge in small size',
      props: {
        status: 'refunded',
        size: 'sm',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Refunded (Medium)',
      description: 'Refunded status badge in medium size',
      props: {
        status: 'refunded',
        size: 'md',
      },
      status: 'prod',
      category: 'size',
    },
  ],
}
