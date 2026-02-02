import React from "react"
import { Layout } from "../../layouts/Layout"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { LayoutEntry } from "../../platform/gallery/registry/types"

export const publicLayoutMeta: GalleryComponentMeta = {
  id: 'layouts/public',
  sourceId: '../../layouts/Layout#Layout',
  status: 'prod',
}

export const publicLayoutGalleryEntry: LayoutEntry<Record<string, unknown>> = {
  id: publicLayoutMeta.id,
  name: 'Public Layout',
  kind: 'layout',
  importPath: publicLayoutMeta.sourceId.split('#')[0],
  category: 'Layouts',
  layoutType: 'public',
  routePattern: '/*',
  description: 'Public-facing layout with header, main content, footer, and early access form',
  layoutSize: 'full',
  meta: publicLayoutMeta,
  slots: [
    { name: 'header', required: true, description: 'Top navigation bar with logo and menu' },
    { name: 'main', required: true, description: 'Primary page content area' },
    { name: 'footer', required: true, description: 'Bottom footer with links and info' },
    { name: 'earlyAccessForm', required: false, description: 'Early access form modal overlay' },
  ],
  variants: [
    {
      name: 'Default',
      description: 'Standard public layout with all sections',
      props: {
        children: React.createElement('div', { className: 'p-8' },
          React.createElement('div', { className: 'mx-auto max-w-4xl' },
            React.createElement('h1', { className: 'text-foreground mb-4 text-2xl font-bold' }, 'Page Content'),
            React.createElement('p', { className: 'text-muted-foreground' },
              'This is the main content area. The layout includes a header at the top, footer at the bottom, and an early access form overlay.'
            )
          )
        ),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Full Width Content',
      description: 'Layout with full-width content area',
      props: {
        children: React.createElement('div', { className: 'w-full' },
          React.createElement('div', { className: 'bg-brand-50 p-12 text-center' },
            React.createElement('h1', { className: 'text-foreground mb-4 text-3xl font-bold' }, 'Full Width Hero'),
            React.createElement('p', { className: 'text-muted-foreground' }, 'Content spans the full width of the viewport')
          )
        ),
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

