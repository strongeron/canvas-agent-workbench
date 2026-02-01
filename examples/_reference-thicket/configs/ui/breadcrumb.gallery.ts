import type { BreadcrumbProps } from "@/components/ui/breadcrumb"
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"

export const breadcrumbMeta: GalleryComponentMeta = {
  id: 'ui/breadcrumb',
  sourceId: '@/components/ui/breadcrumb#Breadcrumb',
  status: 'prod',
}

export const breadcrumbGalleryEntry: GalleryEntry<BreadcrumbProps> = {
  name: 'Breadcrumb',
  importPath: breadcrumbMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: breadcrumbMeta.id,
  layoutSize: 'small',
  meta: breadcrumbMeta,
  variants: [
    {
      name: 'Two Levels',
      description: 'Breadcrumb with two levels',
      props: { items: [{ label: 'Home', path: '/' }, { label: 'Courses' }] },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Three Levels',
      description: 'Basic breadcrumb navigation',
      props: { items: [{ label: 'Home', path: '/' }, { label: 'Courses', path: '/courses' }, { label: 'Renaissance Architecture' }] },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Deep Navigation',
      description: 'Breadcrumb with multiple levels',
      props: { items: [{ label: 'Home', path: '/' }, { label: 'Teacher', path: '/teacher' }, { label: 'Courses', path: '/teacher/courses' }, { label: 'Renaissance Art', path: '/teacher/courses/1' }, { label: 'Edit' }] },
      status: 'archive',
      category: 'variant',
    },
  ],
}
