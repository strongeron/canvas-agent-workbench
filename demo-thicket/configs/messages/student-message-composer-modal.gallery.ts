import { StudentMessageComposerModal, type StudentMessageComposerModalProps } from '../../platform/Messages/StudentMessageComposerModal'

import { GALLERY_COURSES } from '../../platform/gallery/mocks/galleryData'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export { StudentMessageComposerModal }

const GALLERY_STUDENT_USER = {
  id: 90001,
  name: 'Alex Thompson',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  type: 'student' as const,
}

export const studentMessageComposerModalMeta: GalleryComponentMeta = {
  id: 'messages/student-message-composer-modal',
  sourceId: '../../platform/Messages/StudentMessageComposerModal#StudentMessageComposerModal',
  status: 'prod',
}

export const studentMessageComposerModalGalleryEntry: GalleryEntry<StudentMessageComposerModalProps> = {
  id: studentMessageComposerModalMeta.id,
  name: 'StudentMessageComposerModal',
  importPath: studentMessageComposerModalMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  meta: studentMessageComposerModalMeta,
  variants: [
    {
      name: 'Closed State',
      description: 'Student message composer modal in closed state',
      props: {
        isOpen: false,
        onClose: () => {},
        currentUser: GALLERY_STUDENT_USER,
        availableRecipients: [
          {
            id: 90001,
            name: 'Dr. Emily Watson',
            type: 'teacher' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
            course_ids: [90001],
          },
          {
            id: 90002,
            name: 'Jordan Martinez',
            type: 'student' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
            course_ids: [90001],
          },
        ],
        availableCourses: GALLERY_COURSES.map((c) => ({ id: c.id, name: c.title })),
        onSent: () => {},
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Instructor Recipient',
      description: 'Modal showing instructor as primary recipient option',
      props: {
        isOpen: true,
        onClose: () => {},
        currentUser: GALLERY_STUDENT_USER,
        availableRecipients: [
          {
            id: 90001,
            name: 'Dr. Emily Watson',
            type: 'teacher' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
            course_ids: [90001],
          },
        ],
        availableCourses: [
          {
            id: 90001,
            name: 'Introduction to Web Development',
            instructor: {
              id: 90001,
              name: 'Dr. Emily Watson',
              avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
            },
          },
        ],
        onSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Classmate Recipients',
      description: 'Modal with both instructor and classmate options',
      props: {
        isOpen: true,
        onClose: () => {},
        currentUser: GALLERY_STUDENT_USER,
        availableRecipients: [
          {
            id: 90002,
            name: 'Prof. Michael Chang',
            type: 'teacher' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
            course_ids: [90002],
          },
          {
            id: 90002,
            name: 'Jordan Martinez',
            type: 'student' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
            course_ids: [90002],
          },
          {
            id: 90003,
            name: 'Sam Chen',
            type: 'student' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
            course_ids: [90002],
          },
        ],
        availableCourses: [
          {
            id: 90002,
            name: 'Advanced React Patterns',
            instructor: {
              id: 90002,
              name: 'Prof. Michael Chang',
              avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
            },
          },
        ],
        onSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Multiple Courses',
      description: 'Student enrolled in multiple courses with different recipients',
      props: {
        isOpen: true,
        onClose: () => {},
        currentUser: GALLERY_STUDENT_USER,
        availableRecipients: [
          {
            id: 90001,
            name: 'Dr. Emily Watson',
            type: 'teacher' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
            course_ids: [90001, 90003],
          },
          {
            id: 90002,
            name: 'Prof. Michael Chang',
            type: 'teacher' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
            course_ids: [90002],
          },
          {
            id: 90003,
            name: 'Sam Chen',
            type: 'student' as const,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
            course_ids: [90002],
          },
        ],
        availableCourses: GALLERY_COURSES.map((c) => ({ id: c.id, name: c.title })),
        onSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
