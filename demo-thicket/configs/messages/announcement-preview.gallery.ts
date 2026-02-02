import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

interface AnnouncementPreviewProps {
  recipientCount: number
  courseName?: string
  variant?: 'info' | 'warning'
}

const announcementPreviewMeta: GalleryComponentMeta = {
    id: 'messages/announcement-preview',
  sourceId: '@thicket/platform/MessageComposer/AnnouncementPreview#AnnouncementPreview',
  status: 'archive',
}

export const announcementPreviewGalleryEntry: GalleryEntry<AnnouncementPreviewProps> = {
  id: 'messages/announcement-preview',
  name: 'AnnouncementPreview',
  importPath: announcementPreviewMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Info Style (20 Recipients)',
      description: 'Information preview showing 20 students will receive announcement',
      props: {
        recipientCount: 20,
        courseName: 'Advanced React Development',
        variant: 'info',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Info Style (5 Recipients)',
      description: 'Information preview for small class',
      props: {
        recipientCount: 5,
        courseName: 'Introduction to TypeScript',
        variant: 'info',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Warning Style',
      description: 'Warning banner with full announcement details',
      props: {
        recipientCount: 18,
        courseName: 'Full Stack JavaScript',
        variant: 'warning',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Single Recipient',
      description: 'Preview showing singular "student" text',
      props: {
        recipientCount: 1,
        courseName: 'Database Design',
        variant: 'info',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Empty State (No Students)',
      description: 'Preview when no students are enrolled',
      props: {
        recipientCount: 0,
        courseName: 'New Course Launch',
        variant: 'info',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Without Course Name',
      description: 'Preview without explicit course name',
      props: {
        recipientCount: 12,
        variant: 'info',
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
