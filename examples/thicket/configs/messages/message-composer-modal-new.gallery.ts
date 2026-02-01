import { MessageComposerModal, type MessageComposerModalProps } from '@/platform/components/MessageComposer/MessageComposerModal'
import type { GalleryComponentMeta } from '../registry/types'
import { GALLERY_COURSES } from "../mocks/galleryData"
import type { GalleryEntry } from "../registry/types"

export { MessageComposerModal as MessageComposerModalNew }

export const messageComposerModalNewMeta: GalleryComponentMeta = {
  id: 'messages/message-composer-modal-new',
  sourceId: '@/platform/components/MessageComposer/MessageComposerModal#MessageComposerModal',
  status: 'prod',
}

const GALLERY_TEACHER_USER = {
  id: 90001,
  name: 'Dr. Emily Watson',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
  type: 'teacher' as const,
}

const GALLERY_RECIPIENTS = [
  {
    id: 90101,
    name: 'Alex Thompson',
    type: 'student' as const,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    course_ids: [90001, 90002],
  },
  {
    id: 90102,
    name: 'Jordan Martinez',
    type: 'student' as const,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    course_ids: [90001],
  },
]

export const messageComposerModalNewGalleryEntry: GalleryEntry<MessageComposerModalProps> = {
  name: 'MessageComposerModal (New)',
  importPath: messageComposerModalNewMeta.sourceId.split('#')[0],
  category: 'Communication',
  id: messageComposerModalNewMeta.id,
  layoutSize: 'medium',
  meta: messageComposerModalNewMeta,
  variants: [
    {
      name: 'Teacher Individual Message',
      description: 'Teacher composing individual message to a student',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        mode: 'teacher',
        currentUser: GALLERY_TEACHER_USER,
        availableCourses: GALLERY_COURSES.map(c => ({
          id: c.id,
          name: c.title,
          enrolled_students: 15,
        })),
        availableRecipients: GALLERY_RECIPIENTS,
        onSent: () => console.log('Message sent'),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Teacher Announcement Mode',
      description: 'Teacher composing announcement to all students in a course',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        mode: 'teacher',
        currentUser: GALLERY_TEACHER_USER,
        availableCourses: GALLERY_COURSES.slice(0, 2).map(c => ({
          id: c.id,
          name: c.title,
          enrolled_students: 20,
        })),
        availableRecipients: GALLERY_RECIPIENTS,
        onSent: () => console.log('Announcement sent'),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Preselected Recipient',
      description: 'Modal with pre-selected recipient',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        mode: 'teacher',
        currentUser: GALLERY_TEACHER_USER,
        availableCourses: GALLERY_COURSES.map(c => ({
          id: c.id,
          name: c.title,
          enrolled_students: 15,
        })),
        availableRecipients: GALLERY_RECIPIENTS,
        preselectedRecipient: GALLERY_RECIPIENTS[0],
        onSent: () => console.log('Message sent'),
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
