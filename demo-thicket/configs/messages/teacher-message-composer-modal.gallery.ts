import { TeacherMessageComposerModal, type TeacherMessageComposerModalProps } from '../../platform/Messages/TeacherMessageComposerModal'

import { GALLERY_COURSES, GALLERY_STUDENTS } from '../../platform/gallery/mocks/galleryData'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export { TeacherMessageComposerModal }

const GALLERY_TEACHER_USER = {
  id: 90001,
  name: 'Dr. Emily Watson',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
  type: 'teacher' as const,
}

export const teacherMessageComposerModalMeta: GalleryComponentMeta = {
  id: 'messages/teacher-message-composer-modal',
  sourceId: '../../platform/Messages/TeacherMessageComposerModal#TeacherMessageComposerModal',
  status: 'prod',
}

export const teacherMessageComposerModalGalleryEntry: GalleryEntry<TeacherMessageComposerModalProps> = {
  id: teacherMessageComposerModalMeta.id,
  name: 'TeacherMessageComposerModal',
  importPath: teacherMessageComposerModalMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  meta: teacherMessageComposerModalMeta,
  variants: [
    {
      name: 'Closed State',
      description: 'Teacher message composer modal in closed state',
      props: {
        isOpen: false,
        onClose: () => {},
        currentUser: GALLERY_TEACHER_USER,
        availableStudents: GALLERY_STUDENTS.map((s) => ({ ...s, course_ids: [90001, 90002] })),
        availableCourses: GALLERY_COURSES.map((c) => ({ id: c.id, name: c.title })),
        onSent: () => {},
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Individual Message Mode',
      description: 'Modal open in individual message mode with course and student selection',
      props: {
        isOpen: true,
        onClose: () => {},
        currentUser: GALLERY_TEACHER_USER,
        availableStudents: GALLERY_STUDENTS.map((s) => ({ ...s, course_ids: [90001] })),
        availableCourses: GALLERY_COURSES.map((c) => ({
          id: c.id,
          name: c.title,
          enrolled_students: 15,
        })),
        onSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Announcement Mode',
      description: 'Modal open in announcement mode targeting all students in a course',
      props: {
        isOpen: true,
        onClose: () => {},
        currentUser: GALLERY_TEACHER_USER,
        availableStudents: GALLERY_STUDENTS.map((s) => ({
          id: s.id,
          name: s.name,
          avatar_url: s.avatar_url,
          course_ids: [90001, 90002],
        })),
        availableCourses: GALLERY_COURSES.slice(0, 2).map((c) => ({
          id: c.id,
          name: c.title,
          enrolled_students: 20,
        })),
        onSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Empty Course State',
      description: 'No students enrolled in selected course',
      props: {
        isOpen: true,
        onClose: () => {},
        currentUser: GALLERY_TEACHER_USER,
        availableStudents: [],
        availableCourses: [
          { id: 90001, name: 'Introduction to Web Development', enrolled_students: 0 },
        ],
        onSent: () => {},
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
