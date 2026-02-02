import type { ComponentProps } from 'react'

import type { StatsCard } from '@thicket/platform/StatsCard'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type StatsCardProps = ComponentProps<typeof StatsCard>

export const statsCardMeta: GalleryComponentMeta = {
  id: 'platform/stats-card',
  sourceId: '@thicket/platform/StatsCard#StatsCard',
  status: 'prod',
}

/**
 * StatsCard - displays single metric with label, value, and optional delta.
 * Used on dashboards and summary sections.
 */
export const statsCardGalleryEntry: GalleryEntry<StatsCardProps> = {
  name: 'StatsCard',
  importPath: statsCardMeta.sourceId.split('#')[0],
  category: 'Cards & Display',
  id: statsCardMeta.id,
  layoutSize: 'medium',
  meta: statsCardMeta,
  variants: [
    {
      name: 'Simple Metric',
      description: 'Card showing a numeric value',
      props: { label: 'Total Students', value: 247 },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With Subtitle',
      description: 'Card with additional context',
      props: { label: 'Revenue', value: '$12,450', subtitle: '+15% from last month' },
      status: 'prod',
      category: 'variant',
    },
  ],
}
