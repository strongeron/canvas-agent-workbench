import type { CourseTabScheduleProps } from '@thicket/platform/Student/CourseTabSchedule'

import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export const courseTabScheduleMeta: GalleryComponentMeta = {
  id: 'student/course-tab-schedule',
  sourceId: '@thicket/platform/Student/CourseTabSchedule#CourseTabSchedule',
  status: 'prod',
}

export const courseTabScheduleGalleryEntry: GalleryEntry<CourseTabScheduleProps> = {
  id: courseTabScheduleMeta.id,
  name: 'CourseTabSchedule',
  importPath: courseTabScheduleMeta.sourceId.split('#')[0],
  category: 'Student Course Interaction',
  layoutSize: 'large',
  meta: courseTabScheduleMeta,
  variants: [
    {
      name: 'Course Schedule',
      description: 'Schedule tab showing all lessons',
      props: {
        courseId: 1,
        lessons: [
          {
            id: 1,
            title: 'Introduction to Renaissance Art',
            description: 'Overview of the Renaissance period',
            position: 1,
            scheduled_at: '2025-11-08T14:00:00Z',
            topics: ['Historical context', 'Key artists'],
            is_completed: true,
            is_locked: false,
            started_at: '2025-11-08T14:05:00Z',
          },
          {
            id: 2,
            title: 'Gothic Architecture Basics',
            description: 'Introduction to Gothic elements',
            position: 2,
            scheduled_at: '2025-11-15T14:00:00Z',
            topics: ['Flying buttresses', 'Pointed arches'],
            whereby_room_url: 'https://whereby.com/demo-room',
            is_completed: false,
            is_locked: false,
          },
          {
            id: 3,
            title: 'Advanced Gothic Techniques',
            description: 'Deep dive into structural innovations',
            position: 3,
            scheduled_at: '2025-11-22T14:00:00Z',
            is_completed: false,
            is_locked: true,
          },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
