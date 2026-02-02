import React from "react"
import { FormPageLayout } from "@thicket/platform/layouts/patterns/FormPageLayout"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { PagePatternEntry } from "@thicket/platform/gallery/registry/types"
import { Button } from "@thicket/components/ui/button"
import { Input } from "@thicket/components/ui/input"
import { Textarea } from "@thicket/components/ui/textarea"

export const formPageMeta: GalleryComponentMeta = {
  id: 'page-patterns/form-page',
  sourceId: '@thicket/platform/layouts/patterns/FormPageLayout#FormPageLayout',
  status: 'prod',
}

export const formPageGalleryEntry: PagePatternEntry<Record<string, unknown>> = {
  id: formPageMeta.id,
  name: 'Form Page',
  kind: 'page-pattern',
  importPath: formPageMeta.sourceId.split('#')[0],
  category: 'Page Patterns',
  patternType: 'form',
  routePattern: '/**/edit',
  description: 'Standard form page layout with breadcrumb, title, form fields, and optional sidebar',
  layoutSize: 'full',
  meta: formPageMeta,
  slots: [
    { name: 'breadcrumb', required: false, description: 'Breadcrumb navigation items' },
    { name: 'title', required: true, description: 'Page title heading' },
    { name: 'description', required: false, description: 'Page description/subtitle' },
    { name: 'form', required: true, description: 'Main form content area' },
    { name: 'sidebar', required: false, description: 'Optional sidebar content (right on desktop, below on mobile)' },
    { name: 'header', required: false, description: 'Optional header content (alerts, notices)' },
  ],
  variants: [
    {
      name: 'Default - With Sidebar',
      description: 'Standard form page with sidebar on the right',
      props: {
        breadcrumb: [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Edit Profile' },
        ],
        title: 'Edit Your Profile',
        description: 'Update your profile information',
        form: React.createElement('div', { className: 'space-y-6 rounded-xl border border-default bg-white p-6' },
          React.createElement('div', {},
            React.createElement('label', { className: 'text-foreground mb-2 block text-sm font-medium' }, 'Name'),
            React.createElement(Input, { placeholder: 'Enter your name' })
          ),
          React.createElement('div', {},
            React.createElement('label', { className: 'text-foreground mb-2 block text-sm font-medium' }, 'Email'),
            React.createElement(Input, { type: 'email', placeholder: 'Enter your email' })
          ),
          React.createElement('div', {},
            React.createElement('label', { className: 'text-foreground mb-2 block text-sm font-medium' }, 'Bio'),
            React.createElement(Textarea, { placeholder: 'Tell us about yourself', rows: 4 })
          ),
          React.createElement('div', { className: 'flex gap-3' },
            React.createElement(Button, { variant: 'brand' }, 'Save Changes'),
            React.createElement(Button, { variant: 'secondary' }, 'Cancel')
          )
        ),
        sidebar: React.createElement('div', { className: 'rounded-xl border border-default bg-white p-6' },
          React.createElement('h3', { className: 'text-foreground mb-4 text-lg font-semibold' }, 'Help'),
          React.createElement('p', { className: 'text-muted-foreground text-sm' },
            'Your profile information helps instructors and classmates get to know you better.'
          )
        ),
        hasSidebar: true,
        sidebarPosition: 'right',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Without Sidebar',
      description: 'Form page without sidebar - full width form',
      props: {
        breadcrumb: [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Settings' },
        ],
        title: 'Account Settings',
        description: 'Manage your account preferences',
        form: React.createElement('div', { className: 'space-y-6 rounded-xl border border-default bg-white p-6' },
          React.createElement('div', {},
            React.createElement('label', { className: 'text-foreground mb-2 block text-sm font-medium' }, 'Username'),
            React.createElement(Input, { placeholder: 'Enter username' })
          ),
          React.createElement('div', {},
            React.createElement('label', { className: 'text-foreground mb-2 block text-sm font-medium' }, 'Password'),
            React.createElement(Input, { type: 'password', placeholder: 'Enter new password' })
          ),
          React.createElement(Button, { variant: 'brand' }, 'Update Settings')
        ),
        hasSidebar: false,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Mobile - Sidebar Below',
      description: 'Mobile layout with sidebar below form',
      props: {
        breadcrumb: [{ label: 'Profile' }],
        title: 'Edit Profile',
        form: React.createElement('div', { className: 'space-y-4 rounded-xl border border-default bg-white p-4' },
          React.createElement('div', {},
            React.createElement('label', { className: 'text-foreground mb-1 block text-sm font-medium' }, 'Name'),
            React.createElement(Input, { placeholder: 'Name' })
          ),
          React.createElement(Button, { variant: 'brand', className: 'w-full' }, 'Save')
        ),
        sidebar: React.createElement('div', { className: 'rounded-xl border border-default bg-white p-4' },
          React.createElement('p', { className: 'text-muted-foreground text-xs' }, 'Help text appears below form on mobile')
        ),
        hasSidebar: true,
        sidebarPosition: 'bottom',
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

