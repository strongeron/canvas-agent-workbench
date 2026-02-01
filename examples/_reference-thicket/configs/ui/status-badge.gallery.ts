import type { StatusBadgeProps } from "@/components/ui/status-badge"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

const statusBadgeMeta: GalleryComponentMeta = {
    id: 'ui/status-badge',
  sourceId: '@/components/ui/status-badge#StatusBadgeProps',
  status: 'archive',
}

export const statusBadgeGalleryEntry: GalleryEntry<StatusBadgeProps> = {
  name: 'StatusBadge',
  importPath: statusBadgeMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/status-badge',
  layoutSize: 'small',
  variants: [
    {
      name: 'Draft',
      description: 'Draft status badge',
      props: { status: 'draft', size: 'md' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'In Review',
      description: 'In review status badge',
      props: { status: 'in_review', size: 'md' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Waitlist',
      description: 'Waitlist status badge',
      props: { status: 'waitlist', size: 'md' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Published',
      description: 'Published status badge',
      props: { status: 'published', size: 'md' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Archived',
      description: 'Archived status badge',
      props: { status: 'archived', size: 'md' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Small Size',
      description: 'Small status badge',
      props: { status: 'published', size: 'sm' },
      status: 'archive',
      category: 'size',
    },
  ],
}
