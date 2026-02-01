import type { GalleryEntry } from '../registry/types'
import type { GalleryComponentMeta } from '../registry/types'

const logoMaskedMeta: GalleryComponentMeta = {
  id: 'ui/logo-masked',
  sourceId: '@/components/ui/logo-masked#default',
  status: 'archive',
}

export const logoMaskedGalleryEntry: GalleryEntry<Record<string, any>> = {
  name: 'LogoMasked',
  category: 'Base UI',
  id: logoMaskedMeta.id,
  meta: logoMaskedMeta,
  importPath: logoMaskedMeta.sourceId.split('#')[0],
  variants: [
    {
      name: 'Full Logo',
      description: 'Full Thicket logo with wordmark',
      status: 'archive',
      category: 'variant',
      props: {
        variant: 'full',
      },
    },
    {
      name: 'Icon Only',
      description: 'Icon-only version of the logo',
      status: 'archive',
      category: 'variant',
      props: {
        variant: 'icon',
      },
    },
    {
      name: 'Full Logo - Large',
      description: 'Full logo with custom size',
      status: 'archive',
      category: 'size',
      props: {
        variant: 'full',
        className: 'h-12',
      },
    },
    {
      name: 'Icon - Small',
      description: 'Small icon variant',
      status: 'archive',
      category: 'size',
      props: {
        variant: 'icon',
        className: 'h-4 w-4',
      },
    },
    {
      name: 'Icon - Medium',
      description: 'Medium icon variant (default)',
      status: 'archive',
      category: 'size',
      props: {
        variant: 'icon',
        className: 'h-6 w-6',
      },
    },
    {
      name: 'Icon - Large',
      description: 'Large icon variant',
      status: 'archive',
      category: 'size',
      props: {
        variant: 'icon',
        className: 'h-10 w-10',
      },
    },
  ],
}
