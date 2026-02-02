import type { CourseTabMessageBoardProps } from '@thicket/platform/Student/CourseTabMessageBoard'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import { GALLERY_STUDENTS } from '@thicket/platform/gallery/mocks/galleryData'
import type { GalleryEntry } from '../../registry/types'

const courseTabMessageBoardMeta: GalleryComponentMeta = {
    id: 'student/course-tab-message-board',
  sourceId: '@thicket/platform/Student/CourseTabMessageBoard#CourseTabMessageBoardProps',
  status: 'archive',
}

export const courseTabMessageBoardGalleryEntry: GalleryEntry<CourseTabMessageBoardProps> = {
  id: 'student/course-tab-message-board',
  name: 'CourseTabMessageBoard',
  importPath: courseTabMessageBoardMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'large',
  variants: [
    {
      name: 'With Messages',
      description: 'Message board with discussions',
      props: {
        messages: [
          {
            id: 1,
            author: GALLERY_STUDENTS[0].name,
            avatar_url: GALLERY_STUDENTS[0].avatar_url,
            content:
              'Can someone explain the difference between flying buttresses and regular buttresses?',
            created_at: '2025-11-10T15:30:00Z',
            replies: 3,
          },
          {
            id: 2,
            author: GALLERY_STUDENTS[1].name,
            avatar_url: GALLERY_STUDENTS[1].avatar_url,
            content: 'Really enjoyed the first lesson! Looking forward to the next one.',
            created_at: '2025-11-09T12:00:00Z',
            replies: 0,
          },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
