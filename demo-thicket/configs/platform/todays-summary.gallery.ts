import type { TodaysSummary } from "@thicket/platform/TodaysSummary"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

type TodaysSummaryProps = React.ComponentProps<typeof TodaysSummary>

const todaysSummaryMeta: GalleryComponentMeta = {
    id: 'platform/todays-summary',
  sourceId: '@thicket/platform/TodaysSummary#TodaysSummary',
  status: 'archive',
}

export const todaysSummaryGalleryEntry: GalleryEntry<TodaysSummaryProps> = {
  name: 'TodaysSummary',
  importPath: todaysSummaryMeta.sourceId.split('#')[0],
  category: 'Platform Shared',
  id: 'platform/todays-summary',
  layoutSize: 'large',
  variants: [
    {
      name: 'Teacher with Multiple Lessons',
      description: 'Teacher view showing multiple lessons today',
      props: {
        role: 'teacher',
        lessons: [
          {
            id: 90001,
            courseId: 90001,
            title: 'Introduction to React',
            scheduledAt: new Date().toISOString(),
            duration: 60,
            enrolledStudentsCount: 12,
            status: 'scheduled',
          },
          {
            id: 90002,
            courseId: 90001,
            title: 'Advanced Hooks',
            scheduledAt: new Date().toISOString(),
            duration: 90,
            enrolledStudentsCount: 8,
            status: 'scheduled',
          },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Teacher with Single Lesson',
      description: 'Teacher view showing one lesson today',
      props: {
        role: 'teacher',
        lessons: [
          {
            id: 90001,
            courseId: 90001,
            title: 'Introduction to React',
            scheduledAt: new Date().toISOString(),
            duration: 60,
            enrolledStudentsCount: 15,
            status: 'scheduled',
          },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Student with Multiple Lessons',
      description: 'Student view showing multiple lessons today',
      props: {
        role: 'student',
        lessons: [
          {
            id: 90001,
            courseId: 90001,
            title: 'Math 101',
            scheduledAt: new Date().toISOString(),
            duration: 60,
            enrolledStudentsCount: 20,
            status: 'scheduled',
          },
          {
            id: 90002,
            courseId: 90002,
            title: 'Physics Lab',
            scheduledAt: new Date().toISOString(),
            duration: 120,
            enrolledStudentsCount: 15,
            status: 'scheduled',
          },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Student with Single Lesson',
      description: 'Student view showing one lesson today',
      props: {
        role: 'student',
        lessons: [
          {
            id: 90001,
            courseId: 90001,
            title: 'Chemistry Lab',
            scheduledAt: new Date().toISOString(),
            duration: 90,
            enrolledStudentsCount: 18,
            status: 'scheduled',
          },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'No Lessons Today',
      description: 'Returns null when there are no lessons (not rendered)',
      props: {
        role: 'teacher',
        lessons: [],
        __skipRender: true,
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
