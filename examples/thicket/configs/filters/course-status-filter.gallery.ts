import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

type CourseStatusFilterProps = Record<string, never>

export const courseStatusFilterMeta: GalleryComponentMeta = {
  id: 'filters/course-status-filter',
  sourceId: '@/components/course-status-filter#CourseStatusFilter',
  status: 'prod',
}

export const courseStatusFilterGalleryEntry: GalleryEntry<CourseStatusFilterProps> = {
  name: 'CourseStatusFilter',
  importPath: courseStatusFilterMeta.sourceId.split('#')[0],
  category: 'Filtering & Sorting',
  id: courseStatusFilterMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: courseStatusFilterMeta,
  variants: [
    {
      name: 'Multi-Select Status (Inertia)',
      description: 'Uses Inertia router for state, shows count badge, renders with shared constants',
      props: {
        __skipRender: true,
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
