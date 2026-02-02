import type { EmptyStateProps } from "@thicket/components/ui/empty-state"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import { propSchemas } from "@thicket/platform/gallery/registry/schema-helpers"

export const emptyStateMeta: GalleryComponentMeta = {
  id: 'ui/empty-state',
  sourceId: '@thicket/components/ui/empty-state#EmptyState',
  status: 'prod',
}

export const emptyStateGalleryEntry: GalleryEntry<EmptyStateProps> = {
  name: 'EmptyState',
  importPath: emptyStateMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: emptyStateMeta.id,
  layoutSize: 'large',
  meta: emptyStateMeta,
  variants: [
    {
      name: 'Interactive',
      description: 'Customize empty state title and description',
      props: { variant: 'empty', title: 'No items found', description: 'Try adjusting your search' },
      status: 'prod',
      category: 'interactive',
      interactive: true,
      interactiveSchema: {
        title: propSchemas.text('Title', 'No items found'),
        description: propSchemas.text('Description', 'Try adjusting your search'),
        variant: propSchemas.select('Variant', ['empty', 'no-results', 'error'], 'empty'),
        fullHeight: propSchemas.boolean('Full Height'),
      },
    },
    {
      name: 'No Results',
      description: 'Empty state for search results',
      props: { variant: 'no-results' },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Error',
      description: 'Error empty state',
      props: { variant: 'error' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Empty',
      description: 'Generic empty state',
      props: { variant: 'empty' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Custom Title',
      description: 'Empty state with custom text',
      props: { variant: 'empty', title: 'No Courses Yet', description: 'Create your first course to get started teaching.' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With CTA Button',
      description: 'Empty state with primary action button',
      props: {
        variant: 'empty',
        title: 'No messages yet',
        description: 'Start a conversation to see messages here.',
        primaryAction: {
          label: 'New Message',
          onClick: () => {},
          variant: 'brand',
        },
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With CTA Link',
      description: 'Empty state with primary action link',
      props: {
        variant: 'empty',
        title: 'No courses yet',
        description: 'Browse our catalog to find courses that interest you.',
        primaryAction: {
          label: 'Browse Courses',
          href: '/courses',
          variant: 'brand',
        },
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With CTA Icon',
      description: 'Empty state with primary action including icon',
      props: {
        variant: 'empty',
        title: 'No messages yet',
        description: 'Enroll in a course to start messaging.',
        primaryAction: {
          label: 'Browse Courses',
          href: '/courses',
          icon: '📚',
          variant: 'brand',
        },
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Full Height Container',
      description: 'Empty state with full-height container styling (for messages pages)',
      props: {
        variant: 'empty',
        fullHeight: true,
        title: 'No messages yet',
        description: 'Your conversations will appear here once you start messaging.',
        primaryAction: {
          label: 'Browse Courses',
          href: '/courses',
          variant: 'brand',
        },
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
