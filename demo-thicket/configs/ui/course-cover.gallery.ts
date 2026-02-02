import type { CourseCoverProps } from "@thicket/components/ui/course-cover"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export const courseCoverMeta: GalleryComponentMeta = {
  id: 'ui/course-cover',
  sourceId: '@thicket/components/ui/course-cover#CourseCover',
  status: 'prod',
}

export const courseCoverGalleryEntry: GalleryEntry<CourseCoverProps> = {
  name: 'CourseCover',
  importPath: courseCoverMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: courseCoverMeta.id,
  layoutSize: 'medium',
  meta: courseCoverMeta,
  variants: [
    {
      name: 'Card - 4/3 Aspect Ratio',
      description: 'Standard course card cover with 4:3 aspect ratio',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        title: 'Introduction to Web Development',
        variant: 'card',
        aspectRatio: '4/3',
        pointerEventsNone: true,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Card - 3/2 Aspect Ratio',
      description: 'Alternative card cover with 3:2 aspect ratio',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        title: 'Advanced React Patterns',
        variant: 'card',
        aspectRatio: '3/2',
        pointerEventsNone: true,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Card - Video Aspect Ratio',
      description: 'Hero section cover with 16:9 video aspect ratio',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        title: 'Full-Stack Development Course',
        variant: 'card',
        aspectRatio: 'video',
        showOverlay: true,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Card - No Image (Placeholder)',
      description: 'Card variant with ImagePlaceholder fallback',
      props: {
        title: 'Course Without Cover Image',
        variant: 'card',
        aspectRatio: '4/3',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Icon - Small',
      description: 'Small lesson cover icon (48px)',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200',
        title: 'Lesson Cover',
        variant: 'icon',
        size: 'sm',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Icon - Medium',
      description: 'Medium lesson cover icon (64px)',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200',
        title: 'Lesson Cover',
        variant: 'icon',
        size: 'md',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Icon - Large',
      description: 'Large lesson cover icon (80px)',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200',
        title: 'Lesson Cover',
        variant: 'icon',
        size: 'lg',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Icon - No Image (Calendar)',
      description: 'Icon variant with Calendar icon fallback',
      props: {
        title: 'Lesson Without Cover',
        variant: 'icon',
        size: 'md',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Fixed Size - 64x64',
      description: 'Fixed size cover for table rows (64x64px)',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200',
        title: 'Course Cover',
        variant: 'card',
        size: 'fixed',
        fixedSize: { width: 64, height: 64 },
        placeholderSize: 'sm',
        className: 'rounded-lg',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Fixed Size - 80x80',
      description: 'Fixed size cover for forms (80x80px)',
      props: {
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200',
        title: 'Course Cover',
        variant: 'card',
        size: 'fixed',
        fixedSize: { width: 80, height: 80 },
        placeholderSize: 'sm',
        className: 'rounded-lg',
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

