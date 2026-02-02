import type { ComponentProps } from 'react'

import type { CourseFilter } from '@thicket/platform/filters/CourseFilter'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'

type CourseFilterProps = ComponentProps<typeof CourseFilter>

const courseFilterMeta: GalleryComponentMeta = {
  id: 'filters/course-filter',
  sourceId: '@thicket/platform/filters/CourseFilter#CourseFilter',
  status: 'archive',
}

export const courseFilterGalleryEntry: GalleryEntry<CourseFilterProps> = {
  name: 'CourseFilter',
  importPath: courseFilterMeta.sourceId.split('#')[0],
  category: 'Filtering & Sorting',
  id: courseFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: courseFilterMeta,
  variants: [
    {
      name: 'Default State',
      description: 'No course selected, shows "All Courses"',
      props: {
        value: null,
        onChange: () => {},
        courses: [
          { id: 1, title: 'React Fundamentals' },
          { id: 2, title: 'Advanced TypeScript Patterns' },
          { id: 3, title: 'Full-Stack Development' },
          { id: 4, title: 'UI/UX Design Principles' },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Selected Course',
      description: 'Shows selected course title in button',
      props: {
        value: 1,
        onChange: () => {},
        courses: [
          { id: 1, title: 'React Fundamentals' },
          { id: 2, title: 'Advanced TypeScript Patterns' },
          { id: 3, title: 'Full-Stack Development' },
        ],
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Long Course Titles',
      description: 'Handles truncation of long titles automatically',
      props: {
        value: null,
        onChange: () => {},
        courses: [
          { id: 1, title: 'Advanced Full-Stack Web Development with React, Node.js, and PostgreSQL' },
          {
            id: 2,
            title: 'Mastering Machine Learning: From Theory to Production-Ready Applications',
          },
          { id: 3, title: 'Complete Guide to Cloud Architecture and Microservices' },
        ],
      },
      status: 'archive',
      category: 'layout',
    },
    {
      name: 'With "name" Property',
      description: 'Supports courses with "name" instead of "title"',
      props: {
        value: 2,
        onChange: () => {},
        courses: [
          { id: 1, name: 'Course A' },
          { id: 2, name: 'Course B' },
          { id: 3, name: 'Course C' },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Compact Mode',
      description: 'Smaller size for sidebars or message threads',
      props: {
        value: null,
        onChange: () => {},
        courses: [
          { id: 1, title: 'React Course' },
          { id: 2, title: 'TypeScript Course' },
        ],
        compact: true,
      },
      status: 'archive',
      category: 'size',
    },
    {
      name: 'Empty State (Hidden)',
      description: 'Returns null when no courses available',
      props: {
        value: null,
        onChange: () => {},
        courses: [],
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
