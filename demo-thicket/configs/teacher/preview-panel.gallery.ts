import type { PreviewPanelProps } from '../../platform/CourseBuilder/PreviewPanel'

import { GALLERY_COURSES, GALLERY_INSTRUCTORS } from '../../platform/gallery/mocks/galleryData'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

const course = GALLERY_COURSES[0]
const instructor = GALLERY_INSTRUCTORS[0]

export const previewPanelMeta: GalleryComponentMeta = {
  id: 'teacher/preview-panel',
  sourceId: '../../platform/CourseBuilder/PreviewPanel#PreviewPanel',
  status: 'prod',
}

export const previewPanelGalleryEntry: GalleryEntry<PreviewPanelProps> = {
  id: previewPanelMeta.id,
  name: 'PreviewPanel',
  importPath: previewPanelMeta.sourceId.split('#')[0],
  category: 'Course Management',
  layoutSize: 'medium',
  meta: previewPanelMeta,
  variants: [
    {
      name: 'Course Preview',
      description: 'Preview panel for course',
      props: {
        courseData: {
          title: course.title,
          description: course.description,
          price: course.price,
          cover_url: course.cover_url,
        },
        instructor: {
          id: instructor.id,
          name: instructor.name,
          avatar_url: instructor.avatar_url,
        },
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
