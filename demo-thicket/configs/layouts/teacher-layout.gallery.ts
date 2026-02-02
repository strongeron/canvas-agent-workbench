import React from "react"
import { TeacherLayout } from "@thicket/platform/layouts/TeacherLayout"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { LayoutEntry } from "@thicket/platform/gallery/registry/types"

export const teacherLayoutMeta: GalleryComponentMeta = {
  id: 'layouts/teacher',
  sourceId: '@thicket/platform/layouts/TeacherLayout#TeacherLayout',
  status: 'prod',
}

export const teacherLayoutGalleryEntry: LayoutEntry<Record<string, unknown>> = {
  id: teacherLayoutMeta.id,
  name: 'Teacher Layout',
  kind: 'layout',
  importPath: teacherLayoutMeta.sourceId.split('#')[0],
  category: 'Layouts',
  layoutType: 'teacher',
  routePattern: '/teacher/*',
  description: 'Authenticated teacher layout with collapsible sidebar, mobile menu, and main content area',
  layoutSize: 'full',
  meta: teacherLayoutMeta,
  slots: [
    { name: 'sidebar', required: true, description: 'Left navigation sidebar (collapsible on desktop, drawer on mobile)' },
    { name: 'main', required: true, description: 'Primary page content area with padding' },
    { name: 'mobileHeader', required: false, description: 'Mobile header with menu toggle (auto-generated)' },
  ],
  variants: [
    {
      name: 'Default - Expanded Sidebar',
      description: 'Standard teacher layout with expanded sidebar',
      props: {
        children: React.createElement('div', {},
          React.createElement('h1', { className: 'text-foreground mb-4 text-2xl font-bold' }, 'Teacher Dashboard'),
          React.createElement('p', { className: 'text-muted-foreground' },
            'Main content area with expanded sidebar visible on desktop. Sidebar collapses to icon-only mode.'
          )
        ),
        authenticated_user: {
          id: 1,
          name: 'Teacher User',
          email: 'teacher@example.com',
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
          React.createElement('h1', { className: 'text-foreground mb-4 text-2xl font-bold' }, 'Teacher Dashboard'),
          React.createElement('p', { className: 'text-muted-foreground' },
            'Sidebar is collapsed to show only icons, providing more space for content.'
          )
        ),
        authenticated_user: {
          id: 1,
          name: 'Teacher User',
          email: 'teacher@example.com',
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
          React.createElement('h1', { className: 'text-foreground mb-4 text-xl font-bold' }, 'Teacher Dashboard'),
          React.createElement('p', { className: 'text-muted-foreground text-sm' },
            'On mobile, sidebar becomes a drawer that slides in from the left. Header shows menu toggle.'
          )
        ),
        authenticated_user: {
          id: 1,
          name: 'Teacher User',
          email: 'teacher@example.com',
          avatar_url: null,
        },
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

