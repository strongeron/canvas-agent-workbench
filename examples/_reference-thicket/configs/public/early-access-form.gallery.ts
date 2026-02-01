import { EarlyAccessForm } from '@/components/early-access-form'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"
import type { EarlyAccessFormPreview } from "../../components/EarlyAccessFormPreview"

export { EarlyAccessForm }

export const earlyAccessFormMeta: GalleryComponentMeta = {
  id: 'public/early-access-form',
  sourceId: '@/components/early-access-form#EarlyAccessForm',
  status: 'prod',
}

type EarlyAccessFormPreviewProps = React.ComponentProps<typeof EarlyAccessFormPreview>

// Note: The gallery uses EarlyAccessFormPreview (a gallery-specific version without usePage())
// to render interactive previews. The actual EarlyAccessForm component reads props from usePage().
export const earlyAccessFormGalleryEntry: GalleryEntry<EarlyAccessFormPreviewProps> = {
  name: 'EarlyAccessForm',
  importPath: earlyAccessFormMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: earlyAccessFormMeta.id,
  layoutSize: 'medium',
  meta: earlyAccessFormMeta,
  variants: [
    {
      name: 'General Interest',
      description: 'Early access signup modal for general platform interest (no specific course selected).',
      props: {
        isOpen: true,
        onClose: () => {},
        variant: 'general',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Course Waitlist',
      description: 'Waitlist signup modal for a specific course with course info card.',
      props: {
        isOpen: true,
        onClose: () => {},
        variant: 'course-waitlist',
        course: {
          id: 1,
          title: 'Introduction to Renaissance Art History',
          cover_url: undefined,
          instructor: { name: 'Dr. Sarah Mitchell' },
        },
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Success State',
      description: 'Modal showing success message after form submission.',
      props: {
        isOpen: true,
        onClose: () => {},
        variant: 'success',
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
