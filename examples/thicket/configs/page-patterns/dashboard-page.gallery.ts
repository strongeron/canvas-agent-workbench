import React from "react"
import { DashboardLayout } from "@/platform/layouts/patterns/DashboardLayout"
import type { GalleryComponentMeta } from "../registry/types"
import type { PagePatternEntry } from "../registry/types"

export const dashboardPageMeta: GalleryComponentMeta = {
  id: 'page-patterns/dashboard',
  sourceId: '@/platform/layouts/patterns/DashboardLayout#DashboardLayout',
  status: 'prod',
}

export const dashboardPageGalleryEntry: PagePatternEntry<Record<string, unknown>> = {
  id: dashboardPageMeta.id,
  name: 'Dashboard Page',
  kind: 'page-pattern',
  importPath: dashboardPageMeta.sourceId.split('#')[0],
  category: 'Page Patterns',
  patternType: 'dashboard',
  routePattern: '/dashboard',
  description: 'Dashboard layout with stats, cards, filters, and main content grid',
  layoutSize: 'full',
  meta: dashboardPageMeta,
  slots: [
    { name: 'header', required: true, description: 'Page header with title and description' },
    { name: 'stats', required: false, description: 'Statistics cards section' },
    { name: 'filters', required: false, description: 'Filter controls for content' },
    { name: 'content', required: true, description: 'Main content area (cards, table, list, etc.)' },
    { name: 'sidebar', required: false, description: 'Optional sidebar with widgets or additional info' },
  ],
  variants: [
    {
      name: 'Default - With Stats',
      description: 'Dashboard with stats section, filters, and content grid',
      props: {
        header: React.createElement('div', {},
          React.createElement('h1', { className: 'font-display text-foreground mb-2 text-3xl font-bold' }, 'Dashboard'),
          React.createElement('p', { className: 'text-muted-foreground' }, 'Welcome back! Here\'s your overview.')
        ),
        stats: React.createElement('div', { className: 'grid grid-cols-1 gap-4 sm:grid-cols-3' },
          React.createElement('div', { className: 'rounded-xl border border-default bg-white p-4' },
            React.createElement('div', { className: 'text-muted-foreground text-sm' }, 'Total Courses'),
            React.createElement('div', { className: 'text-foreground text-2xl font-bold' }, '12')
          ),
          React.createElement('div', { className: 'rounded-xl border border-default bg-white p-4' },
            React.createElement('div', { className: 'text-muted-foreground text-sm' }, 'Enrolled'),
            React.createElement('div', { className: 'text-foreground text-2xl font-bold' }, '8')
          ),
          React.createElement('div', { className: 'rounded-xl border border-default bg-white p-4' },
            React.createElement('div', { className: 'text-muted-foreground text-sm' }, 'Progress'),
            React.createElement('div', { className: 'text-foreground text-2xl font-bold' }, '65%')
          )
        ),
        filters: React.createElement('div', { className: 'flex gap-2' },
          React.createElement('button', { className: 'rounded-lg border border-default bg-white px-3 py-1.5 text-sm' }, 'All'),
          React.createElement('button', { className: 'rounded-lg border border-default bg-white px-3 py-1.5 text-sm' }, 'Active')
        ),
        content: React.createElement('div', { className: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' },
          React.createElement('div', { className: 'rounded-xl border border-default bg-white p-4' }, 'Course Card 1'),
          React.createElement('div', { className: 'rounded-xl border border-default bg-white p-4' }, 'Course Card 2'),
          React.createElement('div', { className: 'rounded-xl border border-default bg-white p-4' }, 'Course Card 3')
        ),
        hasSidebar: false,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Empty State',
      description: 'Dashboard with empty state when no content',
      props: {
        header: React.createElement('div', {},
          React.createElement('h1', { className: 'font-display text-foreground mb-2 text-3xl font-bold' }, 'Dashboard'),
          React.createElement('p', { className: 'text-muted-foreground' }, 'Get started by enrolling in a course')
        ),
        emptyState: React.createElement('div', { className: 'rounded-xl border border-default bg-white p-12 text-center' },
          React.createElement('p', { className: 'text-muted-foreground text-lg' }, 'No courses yet'),
          React.createElement('p', { className: 'text-muted mt-2 text-sm' }, 'Browse courses to get started')
        ),
        isEmpty: true,
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

