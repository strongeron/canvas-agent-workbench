import type { BreadcrumbProps } from "@thicket/components/ui/breadcrumb"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export const breadcrumbMeta: GalleryComponentMeta = {
  id: 'ui/breadcrumb',
  sourceId: '@thicket/components/ui/breadcrumb#Breadcrumb',
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
