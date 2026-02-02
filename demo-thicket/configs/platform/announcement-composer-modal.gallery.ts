import { AnnouncementComposerModal } from "@thicket/platform/AnnouncementComposerModal"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type AnnouncementComposerModalProps = React.ComponentProps<typeof AnnouncementComposerModal>

export { AnnouncementComposerModal }

export const announcementComposerModalMeta: GalleryComponentMeta = {
  id: 'platform/announcement-composer-modal',
  sourceId: '@thicket/platform/AnnouncementComposerModal#AnnouncementComposerModal',
  status: 'prod',
}

export const announcementComposerModalGalleryEntry: GalleryEntry<AnnouncementComposerModalProps> = {
  name: 'AnnouncementComposerModal',
  importPath: announcementComposerModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: announcementComposerModalMeta.id,
  layoutSize: 'medium',
  meta: announcementComposerModalMeta,
  variants: [
    {
      name: 'Course Announcement Modal',
      description: 'Modal for sending announcements to all enrolled students',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        course: {
          id: 90001,
          title: 'Advanced React Development',
          cover_url: '/images/placeholder.svg',
        },
        enrolledStudents: [
          { id: 90101, name: 'Emily Rodriguez', avatar_url: '/images/placeholder.svg' },
          { id: 90102, name: 'Alex Morgan', avatar_url: '/images/placeholder.svg' },
          { id: 90103, name: 'Jordan Lee', avatar_url: '/images/placeholder.svg' },
        ],
        teacherInfo: {
          id: 90001,
          name: 'Dr. Sarah Chen',
          avatar_url: '/images/placeholder.svg',
        },
        onSent: () => console.log('Announcement sent'),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Large Class Announcement',
      description: 'Announcement modal for course with many students',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        course: {
          id: 90002,
          title: 'Introduction to Web Development',
          cover_url: '/images/placeholder.svg',
        },
        enrolledStudents: Array.from({ length: 25 }, (_, i) => ({
          id: 90200 + i,
          name: `Student ${i + 1}`,
          avatar_url: '/images/placeholder.svg',
        })),
        teacherInfo: {
          id: 90001,
          name: 'Dr. Sarah Chen',
          avatar_url: '/images/placeholder.svg',
        },
        onSent: () => console.log('Announcement sent'),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'No Students Enrolled',
      description: 'Modal when course has no students (send button disabled)',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        course: {
          id: 90003,
          title: 'New Course Launch',
          cover_url: '/images/placeholder.svg',
        },
        enrolledStudents: [],
        teacherInfo: {
          id: 90001,
          name: 'Dr. Sarah Chen',
          avatar_url: '/images/placeholder.svg',
        },
        onSent: () => console.log('Announcement sent'),
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
