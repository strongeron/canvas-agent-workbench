import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from "../../platform/gallery/registry/types"

interface SkeletonProps {
  className?: string
}

export const skeletonMeta: GalleryComponentMeta = {
  id: 'ui/skeleton',
  sourceId: '../../components/ui/skeleton#Skeleton',
  status: 'prod',
}

export const skeletonGalleryEntry: GalleryEntry<SkeletonProps> = {
  name: 'Skeleton',
  importPath: skeletonMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: skeletonMeta.id,
  layoutSize: 'small',
  meta: skeletonMeta,
  variants: [
    {
      name: 'Default',
      description: 'Basic skeleton loading placeholder',
      props: { className: 'h-4 w-full' },
      status: 'prod',
      category: 'shape',
    },
    {
      name: 'Text Line',
      description: 'Skeleton for a single line of text',
      props: { className: 'h-4 w-3/4' },
      status: 'prod',
      category: 'shape',
    },
    {
      name: 'Heading',
      description: 'Skeleton for heading text',
      props: { className: 'h-6 w-1/2' },
      status: 'prod',
      category: 'shape',
    },
    {
      name: 'Avatar',
      description: 'Circular skeleton for avatars',
      props: { className: 'h-12 w-12 rounded-full' },
      status: 'prod',
      category: 'shape',
    },
    {
      name: 'Button',
      description: 'Skeleton for button placeholder',
      props: { className: 'h-10 w-24 rounded-lg' },
      status: 'prod',
      category: 'shape',
    },
    {
      name: 'Card',
      description: 'Skeleton for card content area',
      props: { className: 'h-32 w-full rounded-xl' },
      status: 'prod',
      category: 'shape',
    },
    {
      name: 'Image',
      description: 'Skeleton for image placeholder',
      props: { className: 'h-48 w-full rounded-lg' },
      status: 'prod',
      category: 'shape',
    },
    {
      name: 'Table Row',
      description: 'Skeleton for table row content',
      props: { className: 'h-5 w-full' },
      status: 'prod',
      category: 'shape',
    },
  ],
}
