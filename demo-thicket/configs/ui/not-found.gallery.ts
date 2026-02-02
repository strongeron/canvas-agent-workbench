import type { NotFoundStateProps } from "../../components/ui/not-found"
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from "../../platform/gallery/registry/types"

export const notFoundMeta: GalleryComponentMeta = {
  id: 'ui/not-found',
  sourceId: '../../components/ui/not-found#NotFoundState',
  status: 'prod',
}

export const notFoundGalleryEntry: GalleryEntry<NotFoundStateProps> = {
  name: 'NotFoundState',
  importPath: notFoundMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: notFoundMeta.id,
  layoutSize: 'medium',
  meta: notFoundMeta,
  variants: [
    {
      name: 'Default',
      description: 'Standard not found state with default icon',
      props: {
        title: 'Course not found',
        description: 'The course you\'re looking for doesn\'t exist.',
      },
      status: 'prod',
      category: 'default',
    },
    {
      name: 'Without Icon',
      description: 'Not found state without icon',
      props: {
        title: 'Resource not found',
        description: 'The requested resource could not be located.',
        showIcon: false,
      },
      status: 'prod',
      category: 'variants',
    },
    {
      name: 'With Action',
      description: 'Not found state with action button. The action prop accepts ReactNode (e.g., Button component).',
      props: {
        title: 'Page not found',
        description: 'The page you\'re looking for doesn\'t exist or has been moved.',
      },
      status: 'prod',
      category: 'variants',
    },
    {
      name: 'With Custom MinHeight',
      description: 'Not found state with custom minimum height via className',
      props: {
        title: 'Course not found',
        description: 'The course you\'re looking for doesn\'t exist.',
        className: 'min-h-[60vh]',
      },
      status: 'prod',
      category: 'variants',
    },
    {
      name: 'Custom Icon',
      description: 'Not found state with custom icon. The icon prop accepts ReactNode for custom icons.',
      props: {
        title: 'Access Denied',
        description: 'You don\'t have permission to view this resource.',
      },
      status: 'prod',
      category: 'variants',
    },
  ],
}

