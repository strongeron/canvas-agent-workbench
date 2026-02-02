import type { CourseStatusSelector } from '@thicket/platform/CourseBuilder/CourseStatusSelector'

import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

type CourseStatusSelectorProps = React.ComponentProps<typeof CourseStatusSelector>

export const courseStatusSelectorMeta: GalleryComponentMeta = {
  id: 'teacher/course-status-selector',
  sourceId: '@thicket/platform/CourseBuilder/CourseStatusSelector#CourseStatusSelector',
  status: 'prod',
}

export const courseStatusSelectorGalleryEntry: GalleryEntry<CourseStatusSelectorProps> = {
  id: courseStatusSelectorMeta.id,
  name: 'CourseStatusSelector',
  importPath: courseStatusSelectorMeta.sourceId.split('#')[0],
  category: 'Course Management',
  layoutSize: 'full',
  allowOverflow: true,
  meta: courseStatusSelectorMeta,
  variants: [
    {
      name: 'Draft Selected (Create Mode)',
      description: 'New course being created - draft status selected with gray styling',
      props: {
        value: 'draft',
        onChange: () => console.log('Status changed'),
        editMode: false,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'In Review Selected (Create Mode)',
      description: 'New course ready for submission - in_review status with amber styling',
      props: {
        value: 'in_review',
        onChange: () => console.log('Status changed'),
        editMode: false,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Published Selected',
      description: 'Published course status with green styling',
      props: {
        value: 'published',
        onChange: () => console.log('Status changed'),
        editMode: true,
        originalStatus: 'published',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Edit Mode - Draft Course',
      description: 'Editing a draft course - can switch to draft or in_review',
      props: {
        value: 'draft',
        onChange: () => console.log('Status changed'),
        editMode: true,
        originalStatus: 'draft',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Edit Mode - Published Course (No Enrollments)',
      description: 'Published course with no students - can revert to draft or stay published',
      props: {
        value: 'published',
        onChange: () => console.log('Status changed'),
        editMode: true,
        originalStatus: 'published',
        hasEnrollments: false,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Edit Mode - Published Course (With Enrollments)',
      description: 'Published course with active students - locked to published status only',
      props: {
        value: 'published',
        onChange: () => console.log('Status changed'),
        editMode: true,
        originalStatus: 'published',
        hasEnrollments: true,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With Warning Message',
      description: 'Status selector showing a warning message above options',
      props: {
        value: 'draft',
        onChange: () => console.log('Status changed'),
        warningMessage: 'Publishing will make this course visible to all students on the platform.',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Disabled State',
      description: 'All status options disabled - cannot be changed',
      props: {
        value: 'in_review',
        onChange: () => console.log('Status changed'),
        disabled: true,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Disabled Options',
      description: 'Specific status options disabled while others remain active',
      props: {
        value: 'draft',
        onChange: () => console.log('Status changed'),
        disabledOptions: ['published' as const],
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
