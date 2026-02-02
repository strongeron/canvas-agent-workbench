import React from "react"
import { StudentLayout } from "../../platform/layouts/StudentLayout"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { LayoutEntry } from "../../platform/gallery/registry/types"

export const studentLayoutMeta: GalleryComponentMeta = {
  id: 'layouts/student',
  sourceId: '../../platform/layouts/StudentLayout#StudentLayout',
  status: 'prod',
}

export const studentLayoutGalleryEntry: LayoutEntry<Record<string, unknown>> = {
  id: studentLayoutMeta.id,
  name: 'Student Layout',
  kind: 'layout',
  importPath: studentLayoutMeta.sourceId.split('#')[0],
  category: 'Layouts',
  layoutType: 'student',
  routePattern: '/student/*',
  description: 'Authenticated student layout with collapsible sidebar, mobile menu, and main content area',
  layoutSize: 'full',
  meta: studentLayoutMeta,
  slots: [
    { name: 'sidebar', required: true, description: 'Left navigation sidebar (collapsible on desktop, drawer on mobile)' },
    { name: 'main', required: true, description: 'Primary page content area with padding' },
    { name: 'mobileHeader', required: false, description: 'Mobile header with menu toggle (auto-generated)' },
  ],
  variants: [
    {
      name: 'Default - Expanded Sidebar',
      description: 'Standard student layout with expanded sidebar',
      props: {
        children: React.createElement('div', {},
          React.createElement('h1', { className: 'text-foreground mb-4 text-2xl font-bold' }, 'Student Dashboard'),
          React.createElement('p', { className: 'text-muted-foreground' },
            'Main content area with expanded sidebar visible on desktop. Sidebar collapses to icon-only mode.'
          )
        ),
        authenticated_user: {
          id: 1,
          name: 'Student User',
          email: 'student@example.com',
          avatar_url: null,
        },
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Collapsed Sidebar',
      description: 'Layout with collapsed sidebar (icon-only)',
      props: {
        children: React.createElement('div', {},
          React.createElement('h1', { className: 'text-foreground mb-4 text-2xl font-bold' }, 'Student Dashboard'),
          React.createElement('p', { className: 'text-muted-foreground' },
            'Sidebar is collapsed to show only icons, providing more space for content.'
          )
        ),
        authenticated_user: {
          id: 1,
          name: 'Student User',
          email: 'student@example.com',
          avatar_url: null,
        },
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Mobile View',
      description: 'Mobile layout with drawer menu',
      props: {
        children: React.createElement('div', {},
          React.createElement('h1', { className: 'text-foreground mb-4 text-xl font-bold' }, 'Student Dashboard'),
          React.createElement('p', { className: 'text-muted-foreground text-sm' },
            'On mobile, sidebar becomes a drawer that slides in from the left. Header shows menu toggle.'
          )
        ),
        authenticated_user: {
          id: 1,
          name: 'Student User',
          email: 'student@example.com',
          avatar_url: null,
        },
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

