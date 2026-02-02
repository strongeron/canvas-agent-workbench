import { UnpublishCourseModal, type UnpublishCourseModalProps } from '../../platform/CourseBuilder/UnpublishCourseModal'
import type { GalleryEntry } from '../../platform/gallery/registry/types'
import type { GalleryComponentMeta } from "../../platform/gallery/types"

export { UnpublishCourseModal }

const unpublishCourseModalMeta: GalleryComponentMeta = {
  id: "course-builder/unpublish-course-modal",
  sourceId: "../../platform/CourseBuilder/UnpublishCourseModal#UnpublishCourseModal",
  status: 'prod',
}

export const unpublishCourseModalGalleryEntry: GalleryEntry<UnpublishCourseModalProps> = {
  name: 'UnpublishCourseModal',
  importPath: '../../platform/CourseBuilder/UnpublishCourseModal',
  category: 'Course Management',
  id: unpublishCourseModalMeta.id,
  meta: unpublishCourseModalMeta,
  layoutSize: 'medium',
  variants: [
    {
      name: 'Short Course Name',
      description: 'Modal with short course title',
      props: {
        isOpen: true,
        onClose: () => console.log('Close modal'),
        onConfirm: () => console.log('Unpublish confirmed'),
        courseName: 'Introduction to React',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Long Course Name',
      description: 'Modal with long course title to test text wrapping',
      props: {
        isOpen: true,
        onClose: () => console.log('Close modal'),
        onConfirm: () => console.log('Unpublish confirmed'),
        courseName: 'Advanced Full-Stack Web Development with React, TypeScript, and Node.js',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Default State',
      description: 'Standard unpublish warning modal',
      props: {
        isOpen: true,
        onClose: () => console.log('Close modal'),
        onConfirm: () => console.log('Unpublish confirmed'),
        courseName: 'Data Structures and Algorithms Fundamentals',
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
