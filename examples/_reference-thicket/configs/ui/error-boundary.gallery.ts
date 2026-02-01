import type { GalleryEntry } from '../registry/types'
import type { GalleryComponentMeta } from '../registry/types'

const ThrowingComponent = () => {
  throw new Error('This is a simulated error for testing')
}

const errorBoundaryMeta: GalleryComponentMeta = {
  id: 'ui/error-boundary',
  sourceId: '@/components/ui/error-boundary#default',
  status: 'archive',
}

export const errorBoundaryGalleryEntry: GalleryEntry<Record<string, any>> = {
  name: 'ErrorBoundary',
  category: 'Base UI',
  id: errorBoundaryMeta.id,
  meta: errorBoundaryMeta,
  importPath: errorBoundaryMeta.sourceId.split('#')[0],
  variants: [
    {
      name: 'Default Error State',
      description: 'Default error boundary showing error with retry button',
      status: 'archive',
      category: 'state',
      props: {
        __skipRender: true,
      },
    },
    {
      name: 'With Custom Fallback',
      description: 'Error boundary with custom fallback UI',
      status: 'archive',
      category: 'variant',
      props: {
        __skipRender: true,
      },
    },
    {
      name: 'With Error Handler',
      description: 'Error boundary with onError callback for logging',
      status: 'archive',
      category: 'variant',
      props: {
        __skipRender: true,
      },
    },
  ],
}
