import React from "react"
import { CourseDetailLayout } from "@thicket/platform/layouts/patterns/CourseDetailLayout"
import { CourseHero } from "@thicket/components/course-hero"
import { CourseTabs } from "@thicket/platform/Student/CourseTabs"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { PagePatternEntry } from "@thicket/platform/gallery/registry/types"

export const courseDetailPageMeta: GalleryComponentMeta = {
  id: 'page-patterns/course-detail',
  sourceId: '@thicket/platform/layouts/patterns/CourseDetailLayout#CourseDetailLayout',
  status: 'prod',
}

export const courseDetailPageGalleryEntry: PagePatternEntry<Record<string, unknown>> = {
  id: courseDetailPageMeta.id,
  name: 'Course Detail Page',
  kind: 'page-pattern',
  importPath: courseDetailPageMeta.sourceId.split('#')[0],
  category: 'Page Patterns',
  patternType: 'course-detail',
  routePattern: '/courses/:id',
  description: 'Standard course detail page with hero section, sidebar, and tab navigation',
  layoutSize: 'full',
  meta: courseDetailPageMeta,
  slots: [
    { name: 'breadcrumb', required: false, description: 'Breadcrumb navigation' },
    { name: 'hero', required: true, description: 'Course hero section with title, image, and key info' },
    { name: 'sidebar', required: false, description: 'Right sidebar with metrics, actions, or related content' },
    { name: 'tabs', required: true, description: 'Tab navigation for course sections (home, schedule, files, etc.)' },
    { name: 'tabContent', required: true, description: 'Content for the active tab' },
  ],
  variants: [
    {
      name: 'Default - With Sidebar',
      description: 'Standard course detail layout with hero, sidebar, and tabs',
      props: {
        breadcrumb: [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'My Courses', path: '/courses' },
          { label: 'Course Title' },
        ],
        hero: React.createElement(CourseHero, {
          title: 'Introduction to React',
          description: 'Learn the fundamentals of React and build modern web applications',
          imageUrl: 'https://via.placeholder.com/800x400',
          durationWeeks: 8,
          startsAt: new Date().toISOString(),
        }),
        sidebar: React.createElement('div', { className: 'rounded-xl border border-default bg-white p-6' },
          React.createElement('h3', { className: 'text-foreground mb-4 text-lg font-semibold' }, 'Course Info'),
          React.createElement('p', { className: 'text-muted-foreground text-sm' }, 'Sidebar content goes here')
        ),
        hasSidebar: true,
        sidebarPosition: 'right',
        tabs: React.createElement(CourseTabs, {
          tabs: [
            { id: 'home', label: 'Home', content: React.createElement('div', {}, 'Home content') },
            { id: 'schedule', label: 'Schedule', content: React.createElement('div', {}, 'Schedule content') },
          ],
          activeTab: 'home',
          onTabChange: () => {},
        }),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Mobile - Sidebar Below',
      description: 'Mobile responsive layout with sidebar below hero',
      props: {
        breadcrumb: [{ label: 'Course Title' }],
        hero: React.createElement(CourseHero, {
          title: 'Introduction to React',
          description: 'Learn React fundamentals',
          imageUrl: 'https://via.placeholder.com/800x400',
          durationWeeks: 8,
        }),
        sidebar: React.createElement('div', { className: 'rounded-xl border border-default bg-white p-4' },
          React.createElement('p', { className: 'text-muted-foreground text-sm' }, 'Sidebar appears below on mobile')
        ),
        hasSidebar: true,
        sidebarPosition: 'bottom',
        tabs: React.createElement(CourseTabs, {
          tabs: [{ id: 'home', label: 'Home', content: React.createElement('div', {}, 'Content') }],
          activeTab: 'home',
          onTabChange: () => {},
        }),
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

