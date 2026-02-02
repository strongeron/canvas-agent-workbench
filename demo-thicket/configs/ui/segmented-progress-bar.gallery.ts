import type { SegmentedProgressBarProps } from "@thicket/components/ui/segmented-progress-bar"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export const segmentedProgressBarMeta: GalleryComponentMeta = {
  id: 'ui/segmented-progress-bar',
  sourceId: '@thicket/components/ui/segmented-progress-bar#SegmentedProgressBar',
  status: 'prod',
}

export const segmentedProgressBarGalleryEntry: GalleryEntry<SegmentedProgressBarProps> = {
  name: 'SegmentedProgressBar',
  importPath: segmentedProgressBarMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: segmentedProgressBarMeta.id,
  layoutSize: 'small',
  meta: segmentedProgressBarMeta,
  variants: [
    {
      name: 'Low Progress',
      description: 'Progress bar with 20% completion',
      props: {
        lessons: [
          { id: 1, position: 1, title: 'Introduction', isCompleted: true, isCurrent: false },
          { id: 2, position: 2, title: 'Basics', isCompleted: true, isCurrent: false },
          { id: 3, position: 3, title: 'Intermediate', isCompleted: false, isCurrent: true },
          { id: 4, position: 4, title: 'Advanced', isCompleted: false, isCurrent: false },
          { id: 5, position: 5, title: 'Expert', isCompleted: false, isCurrent: false },
          { id: 6, position: 6, title: 'Mastery', isCompleted: false, isCurrent: false },
          { id: 7, position: 7, title: 'Practice', isCompleted: false, isCurrent: false },
          { id: 8, position: 8, title: 'Project 1', isCompleted: false, isCurrent: false },
          { id: 9, position: 9, title: 'Project 2', isCompleted: false, isCurrent: false },
          { id: 10, position: 10, title: 'Final', isCompleted: false, isCurrent: false },
        ]
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Half Complete',
      description: 'Progress bar with 50% completion',
      props: {
        lessons: [
          { id: 1, position: 1, title: 'Introduction', isCompleted: true, isCurrent: false },
          { id: 2, position: 2, title: 'Basics', isCompleted: true, isCurrent: false },
          { id: 3, position: 3, title: 'Intermediate', isCompleted: true, isCurrent: false },
          { id: 4, position: 4, title: 'Advanced', isCompleted: true, isCurrent: false },
          { id: 5, position: 5, title: 'Expert', isCompleted: true, isCurrent: false },
          { id: 6, position: 6, title: 'Mastery', isCompleted: false, isCurrent: true },
          { id: 7, position: 7, title: 'Practice', isCompleted: false, isCurrent: false },
          { id: 8, position: 8, title: 'Project 1', isCompleted: false, isCurrent: false },
          { id: 9, position: 9, title: 'Project 2', isCompleted: false, isCurrent: false },
          { id: 10, position: 10, title: 'Final', isCompleted: false, isCurrent: false },
        ]
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Nearly Done',
      description: 'Progress bar with 80% completion',
      props: {
        lessons: [
          { id: 1, position: 1, title: 'Introduction', isCompleted: true, isCurrent: false },
          { id: 2, position: 2, title: 'Basics', isCompleted: true, isCurrent: false },
          { id: 3, position: 3, title: 'Intermediate', isCompleted: true, isCurrent: false },
          { id: 4, position: 4, title: 'Advanced', isCompleted: true, isCurrent: false },
          { id: 5, position: 5, title: 'Expert', isCompleted: true, isCurrent: false },
          { id: 6, position: 6, title: 'Mastery', isCompleted: true, isCurrent: false },
          { id: 7, position: 7, title: 'Practice', isCompleted: true, isCurrent: false },
          { id: 8, position: 8, title: 'Project 1', isCompleted: true, isCurrent: false },
          { id: 9, position: 9, title: 'Project 2', isCompleted: false, isCurrent: true },
          { id: 10, position: 10, title: 'Final', isCompleted: false, isCurrent: false },
        ]
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Fully Complete',
      description: 'Progress bar at 100% completion',
      props: {
        lessons: [
          { id: 1, position: 1, title: 'Introduction', isCompleted: true, isCurrent: false },
          { id: 2, position: 2, title: 'Basics', isCompleted: true, isCurrent: false },
          { id: 3, position: 3, title: 'Intermediate', isCompleted: true, isCurrent: false },
          { id: 4, position: 4, title: 'Advanced', isCompleted: true, isCurrent: false },
          { id: 5, position: 5, title: 'Expert', isCompleted: true, isCurrent: false },
          { id: 6, position: 6, title: 'Mastery', isCompleted: true, isCurrent: false },
          { id: 7, position: 7, title: 'Practice', isCompleted: true, isCurrent: false },
          { id: 8, position: 8, title: 'Project 1', isCompleted: true, isCurrent: false },
          { id: 9, position: 9, title: 'Project 2', isCompleted: true, isCurrent: false },
          { id: 10, position: 10, title: 'Final', isCompleted: true, isCurrent: false },
        ]
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
