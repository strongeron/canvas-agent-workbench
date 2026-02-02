import type { ConfirmationModalProps } from "../../components/ui/confirmation-modal"
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from "../../platform/gallery/registry/types"

export const confirmationModalMeta: GalleryComponentMeta = {
  id: 'ui/confirmation-modal',
  sourceId: '../../components/ui/confirmation-modal#ConfirmationModal',
  status: 'prod',
}

export const confirmationModalGalleryEntry: GalleryEntry<ConfirmationModalProps> = {
  name: 'ConfirmationModal',
  importPath: confirmationModalMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: confirmationModalMeta.id,
  layoutSize: 'medium',
  meta: confirmationModalMeta,
  variants: [
    {
      name: 'Warning',
      description: 'Warning confirmation modal',
      props: { isOpen: false, onClose: () => {}, onConfirm: () => {}, title: 'Unsaved Changes', message: 'You have unsaved changes. Are you sure you want to leave?', variant: 'warning', confirmText: 'Leave', cancelText: 'Stay' },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Danger',
      description: 'Danger confirmation modal',
      props: { isOpen: false, onClose: () => {}, onConfirm: () => {}, title: 'Delete Course', message: 'This action cannot be undone. All student enrollments will be removed.', variant: 'danger', confirmText: 'Delete', cancelText: 'Cancel' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Processing',
      description: 'Modal in processing state',
      props: { isOpen: false, onClose: () => {}, onConfirm: () => {}, title: 'Confirm Payment', message: 'Please wait while we process your payment...', variant: 'warning', isProcessing: true },
      status: 'archive',
      category: 'state',
    },
  ],
}
