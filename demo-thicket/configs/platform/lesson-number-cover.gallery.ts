import type { LessonNumberCoverProps } from "@thicket/platform/LessonNumberCover"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export const lessonNumberCoverMeta: GalleryComponentMeta = {
  id: 'platform/lesson-number-cover',
  sourceId: '@thicket/platform/LessonNumberCover#LessonNumberCover',
  status: 'prod',
}

export const lessonNumberCoverGalleryEntry: GalleryEntry<LessonNumberCoverProps> = {
  name: 'LessonNumberCover',
  importPath: lessonNumberCoverMeta.sourceId.split('#')[0],
  category: 'Platform Shared',
  id: lessonNumberCoverMeta.id,
  layoutSize: 'small',
  meta: lessonNumberCoverMeta,
  variants: [
    {
      name: 'Upcoming - Lesson 1',
      description: 'Upcoming lesson with default styling',
      props: {
        lessonNumber: 1,
        status: 'upcoming',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Upcoming - Lesson 5',
      description: 'Upcoming lesson with default styling',
      props: {
        lessonNumber: 5,
        status: 'upcoming',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Completed - Lesson 3',
      description: 'Completed lesson with green styling',
      props: {
        lessonNumber: 3,
        status: 'completed',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Completed - Lesson 10',
      description: 'Completed lesson with green styling',
      props: {
        lessonNumber: 10,
        status: 'completed',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Locked - Lesson 7',
      description: 'Locked lesson with gray styling',
      props: {
        lessonNumber: 7,
        status: 'locked',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Live - Lesson 2',
      description: 'Live lesson with brand styling',
      props: {
        lessonNumber: 2,
        status: 'live',
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

