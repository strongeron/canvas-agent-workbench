import { ResetDraftModal } from "@thicket/platform/ResetDraftModal"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type ResetDraftModalProps = React.ComponentProps<typeof ResetDraftModal>

export { ResetDraftModal }

export const resetDraftModalMeta: GalleryComponentMeta = {
  id: 'modals/reset-draft-modal',
  sourceId: '@thicket/platform/ResetDraftModal#ResetDraftModal',
  status: 'prod',
}

export const resetDraftModalGalleryEntry: GalleryEntry<ResetDraftModalProps> = {
  name: 'ResetDraftModal',
  importPath: resetDraftModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: resetDraftModalMeta.id,
  layoutSize: 'medium',
  meta: resetDraftModalMeta,
  variants: [
    {
      name: 'Reset New Course Draft',
      description: 'Confirmation modal for resetting a new course draft',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm reset'),
        mode: 'create',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Reset Edit Draft',
      description: 'Confirmation modal for resetting draft changes to published course',
      props: {
        isOpen: true,
        onClose: () => console.log('Close'),
        onConfirm: () => console.log('Confirm reset'),
        mode: 'edit',
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
