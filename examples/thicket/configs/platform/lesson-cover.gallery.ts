import type { LessonCoverProps } from "@/platform/components/LessonCover"
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"

export const lessonCoverMeta: GalleryComponentMeta = {
  id: 'platform/lesson-cover',
  sourceId: '@/platform/components/LessonCover#LessonCover',
  status: 'prod',
}

export const lessonCoverGalleryEntry: GalleryEntry<LessonCoverProps> = {
  name: 'LessonCover',
  importPath: lessonCoverMeta.sourceId.split('#')[0],
  category: 'Platform Shared',
  id: lessonCoverMeta.id,
  layoutSize: 'medium',
  meta: lessonCoverMeta,
  variants: [
    {
      name: 'With Image - Upcoming',
      description: 'Lesson cover with image and upcoming status',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        title: 'Introduction to React Hooks',
        lessonNumber: 1,
        lessonStatus: 'upcoming',
        variant: 'card',
        aspectRatio: '4/3',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With Image - Completed',
      description: 'Lesson cover with image and completed status',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        title: 'Advanced State Management',
        lessonNumber: 5,
        lessonStatus: 'completed',
        variant: 'card',
        aspectRatio: '4/3',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Without Image - Upcoming (Number Badge)',
      description: 'Lesson cover without image, showing lesson number badge in card context',
      props: {
        title: 'Lesson 3: Component Patterns',
        lessonNumber: 3,
        lessonStatus: 'upcoming',
        variant: 'card',
        aspectRatio: '4/3',
        className: 'rounded-t-lg',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Without Image - Completed (Number Badge)',
      description: 'Lesson cover without image, showing completed lesson number badge in card context',
      props: {
        title: 'Lesson 8: Testing Strategies',
        lessonNumber: 8,
        lessonStatus: 'completed',
        variant: 'card',
        aspectRatio: '4/3',
        className: 'rounded-t-lg',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Without Image - Locked (Number Badge)',
      description: 'Lesson cover without image, showing locked lesson number badge in card context',
      props: {
        title: 'Lesson 12: Advanced Topics',
        lessonNumber: 12,
        lessonStatus: 'locked',
        variant: 'card',
        aspectRatio: '4/3',
        className: 'rounded-t-lg',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Without Image - Live (Number Badge)',
      description: 'Lesson cover without image, showing live lesson number badge in card context',
      props: {
        title: 'Lesson 2: Live Session',
        lessonNumber: 2,
        lessonStatus: 'live',
        variant: 'card',
        aspectRatio: '4/3',
        className: 'rounded-t-lg',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Video Aspect Ratio - With Image',
      description: 'Lesson cover with video aspect ratio and image',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        title: 'Live Lesson Stream',
        lessonNumber: 4,
        lessonStatus: 'live',
        variant: 'card',
        aspectRatio: 'video',
        showOverlay: true,
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

