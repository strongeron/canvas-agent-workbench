import type { ComponentProps } from 'react'

import type { NewbieEmptyState } from '../../platform/NewbieEmptyState'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from "../../platform/gallery/registry/types"

type NewbieEmptyStateProps = ComponentProps<typeof NewbieEmptyState>

export const newbieEmptyStateMeta: GalleryComponentMeta = {
  id: 'platform/newbie-empty-state',
  sourceId: '../../platform/NewbieEmptyState#NewbieEmptyState',
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
