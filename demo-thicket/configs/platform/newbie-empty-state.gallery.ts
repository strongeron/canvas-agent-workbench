import type { ComponentProps } from 'react'

import type { NewbieEmptyState } from '@thicket/platform/NewbieEmptyState'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type NewbieEmptyStateProps = ComponentProps<typeof NewbieEmptyState>

export const newbieEmptyStateMeta: GalleryComponentMeta = {
  id: 'platform/newbie-empty-state',
  sourceId: '@thicket/platform/NewbieEmptyState#NewbieEmptyState',
  status: 'prod',
}

/**
 * NewbieEmptyState - onboarding checklist for new teachers.
 * Displays steps for Stripe setup, profile completion, and course creation.
 */
export const newbieEmptyStateGalleryEntry: GalleryEntry<NewbieEmptyStateProps> = {
  name: 'NewbieEmptyState',
  importPath: newbieEmptyStateMeta.sourceId.split('#')[0],
  category: 'Notifications & Feedback',
  id: newbieEmptyStateMeta.id,
  layoutSize: 'large',
  meta: newbieEmptyStateMeta,
  variants: [
    {
      name: 'All Steps Incomplete',
      description: 'Initial state with all steps pending',
      props: { teacherName: 'Nicholas', teacherId: 90002, stripeConnected: false, profileCompleted: false, hasCourses: false },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Partial Progress',
      description: 'Some steps completed',
      props: { teacherName: 'Nicholas', teacherId: 90002, stripeConnected: true, profileCompleted: true, hasCourses: false },
      status: 'prod',
      category: 'state',
    },
  ],
}
