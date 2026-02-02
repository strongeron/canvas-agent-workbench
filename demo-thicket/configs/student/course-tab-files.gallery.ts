import type { CourseTabFilesProps } from '@thicket/platform/Student/CourseTabFiles'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import type { GalleryEntry } from '../../registry/types'

const courseTabFilesMeta: GalleryComponentMeta = {
    id: 'student/course-tab-files',
  sourceId: '@thicket/platform/Student/CourseTabFiles#CourseTabFilesProps',
  status: 'archive',
}

export const courseTabFilesGalleryEntry: GalleryEntry<CourseTabFilesProps> = {
  id: 'student/course-tab-files',
  name: 'CourseTabFiles',
  importPath: courseTabFilesMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'large',
  variants: [
    {
      name: 'With Files',
      description: 'Files tab with course materials',
      props: {
        files: [
          {
            id: 1,
            name: 'Course Syllabus.pdf',
            type: 'PDF',
            size: '2.3 MB',
            uploaded_at: '2025-11-01T10:00:00Z',
          },
          {
            id: 2,
            name: 'Week 1 Slides.pptx',
            type: 'PowerPoint',
            size: '5.7 MB',
            uploaded_at: '2025-11-08T09:00:00Z',
          },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Empty State',
      description: 'No files uploaded yet',
      props: { files: [] },
      status: 'archive',
      category: 'state',
    },
  ],
}
