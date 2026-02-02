import type { CourseTabsProps } from '../../platform/Student/CourseTabs'

import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export const courseTabsMeta: GalleryComponentMeta = {
    id: 'home',
  sourceId: '../../platform/Student/CourseTabs#CourseTabs',
  status: 'prod',
}

export const courseTabsGalleryEntry: GalleryEntry<CourseTabsProps> = {
  id: courseTabsMeta.id,
  name: 'CourseTabs',
  importPath: courseTabsMeta.sourceId.split('#')[0],
  category: 'Student Experience',
  layoutSize: 'large',
  meta: courseTabsMeta,
  variants: [
    {
      name: 'Home Tab Active',
      description: 'Course tabs with home selected',
      props: {
        tabs: [
          { id: 'home', label: 'Home', content: 'Home content' },
          { id: 'schedule', label: 'Schedule', content: 'Schedule content' },
          { id: 'files', label: 'Files', content: 'Files content' },
          { id: 'classmates', label: 'Classmates', content: 'Classmates content' },
          { id: 'messages', label: 'Messages', content: 'Messages content' },
        ],
        activeTab: 'home',
        onTabChange: () => {},
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
