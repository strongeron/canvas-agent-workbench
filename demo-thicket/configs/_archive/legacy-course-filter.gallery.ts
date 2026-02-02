import type { ComponentProps } from 'react'

import type { CourseFilter } from '../../platform/_archive/CourseFilter'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../platform/gallery/registry/types'

type CourseFilterProps = ComponentProps<typeof CourseFilter>

const legacyCourseFilterMeta: GalleryComponentMeta = {
  id: '_archive/legacy-course-filter',
  sourceId: '../../platform/_archive/CourseFilter#CourseFilter',
  status: 'archive',
}

export const legacyCourseFilterGalleryEntry: GalleryEntry<CourseFilterProps> = {
  name: 'CourseFilter (Legacy)',
  importPath: legacyCourseFilterMeta.sourceId.split('#')[0],
  category: 'Archive',
  id: legacyCourseFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: legacyCourseFilterMeta,
  variants: [
    {
      name: 'Default State',
      description: 'Legacy CourseFilter using FilterButton - no course selected',
      props: {
        value: null,
        onChange: () => {},
        courses: [
          { id: 1, title: 'React Fundamentals' },
          { id: 2, title: 'Advanced TypeScript' },
          { id: 3, title: 'Full-Stack Development' },
        ],
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Selected Course',
      description: 'Legacy CourseFilter with course selected',
      props: {
        value: 1,
        onChange: () => {},
        courses: [
          { id: 1, title: 'React Fundamentals' },
          { id: 2, title: 'Advanced TypeScript' },
        ],
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Compact Mode',
      description: 'Legacy CourseFilter in compact mode',
      props: {
        value: null,
        onChange: () => {},
        courses: [
          { id: 1, title: 'Course A' },
          { id: 2, title: 'Course B' },
        ],
        compact: true,
      },
      status: 'archive',
      category: 'size',
    },
  ],
}
