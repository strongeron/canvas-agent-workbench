import { MessageComposerModal, type MessageComposerModalProps } from '@/platform/components/MessageComposerModal'
import type { GalleryComponentMeta } from '../registry/types'

import { GALLERY_COURSES } from '../mocks/galleryData'
import type { GalleryEntry } from '../registry/types'

export { MessageComposerModal }

const messageComposerModalMeta: GalleryComponentMeta = {
    id: 'messages/message-composer-modal',
  sourceId: '@/platform/components/MessageComposerModal#MessageComposerModalProps',
  status: 'archive',
}

export const messageComposerModalGalleryEntry: GalleryEntry<MessageComposerModalProps> = {
  id: 'messages/message-composer-modal',
  name: 'MessageComposerModal',
  importPath: messageComposerModalMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Closed State',
      description: 'Message composer modal in closed state',
      props: {
        isOpen: false,
        onClose: () => {},
        recipient: {
          id: 90001,
          name: 'Alex Thompson',
          email: 'alex@example.com',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
          enrolled_courses: [{ course_id: 90001 }],
        },
        availableCourses: GALLERY_COURSES.slice(0, 3).map((c) => ({ id: c.id, title: c.title })),
        teacherInfo: {
          id: 90001,
          name: 'Dr. Emily Watson',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
        },
        userRole: 'teacher' as const,
        onSent: () => {},
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Teacher Flow',
      description:
        'Teacher messaging a student. Shows all teacher courses without filtering by student enrollment.',
      props: {
        isOpen: true,
        onClose: () => {},
        recipient: {
          id: 90001,
          name: 'Alex Thompson',
          email: 'alex@example.com',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
          enrolled_courses: [{ course_id: 90001 }],
        },
        availableCourses: GALLERY_COURSES.slice(0, 3).map((c) => ({ id: c.id, title: c.title })),
        teacherInfo: {
          id: 90001,
          name: 'Dr. Emily Watson',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
        },
        userRole: 'teacher' as const,
        onSent: () => {},
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Student Flow',
      description:
        'Student messaging a teacher. Only shows courses where student is enrolled.',
      props: {
        isOpen: true,
        onClose: () => {},
        recipient: {
          id: 90002,
          name: 'Dr. Emily Watson',
          email: 'emily@example.com',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
          enrolled_courses: [{ course_id: 90001 }, { course_id: 90002 }],
        },
        availableCourses: GALLERY_COURSES.slice(0, 3).map((c) => ({ id: c.id, title: c.title })),
        teacherInfo: {
          id: 90003,
          name: 'Alex Thompson',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        },
        userRole: 'student' as const,
        onSent: () => {},
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
