import { PublishConfirmationModal } from "@thicket/platform/PublishConfirmationModal"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type PublishConfirmationModalProps = React.ComponentProps<typeof PublishConfirmationModal>

export { PublishConfirmationModal }

export const publishConfirmationModalMeta: GalleryComponentMeta = {
  id: 'modals/publish-confirmation-modal',
  sourceId: '@thicket/platform/PublishConfirmationModal#PublishConfirmationModal',
  status: 'prod',
}

export const publishConfirmationModalGalleryEntry: GalleryEntry<PublishConfirmationModalProps> = {
  name: 'PublishConfirmationModal',
  importPath: publishConfirmationModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: publishConfirmationModalMeta.id,
  layoutSize: 'medium',
  meta: publishConfirmationModalMeta,
  variants: [
    {
      name: 'Publish New Course',
      description: 'Confirmation for publishing a new course',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm'),
        courseTitle: 'Advanced React Development',
        status: 'published',
        mode: 'create',
        isSubmitting: false,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Publish Existing Course',
      description: 'Confirmation for publishing an edited course',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm'),
        courseTitle: 'Full Stack JavaScript',
        status: 'published',
        mode: 'edit',
        isSubmitting: false,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Waitlist New Course',
      description: 'Confirmation for creating waitlist course',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm'),
        courseTitle: 'TypeScript Mastery',
        status: 'waitlist',
        mode: 'create',
        isSubmitting: false,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Save Draft New Course',
      description: 'Confirmation for saving new course as draft',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm'),
        courseTitle: 'Node.js Backend Development',
        status: 'draft',
        mode: 'create',
        isSubmitting: false,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Submitting State',
      description: 'Modal showing submitting/loading state',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm'),
        courseTitle: 'Advanced React Development',
        status: 'published',
        mode: 'create',
        isSubmitting: true,
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
