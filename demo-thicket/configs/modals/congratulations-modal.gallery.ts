import type { ComponentProps } from 'react'

import { CongratulationsModal } from '../../platform/CongratulationsModal'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from "../../platform/gallery/registry/types"

type CongratulationsModalProps = ComponentProps<typeof CongratulationsModal>

export { CongratulationsModal }

export const congratulationsModalMeta: GalleryComponentMeta = {
  id: 'modals/congratulations-modal',
  sourceId: '../../platform/CongratulationsModal#CongratulationsModal',
  status: 'prod',
}

/**
 * CongratulationsModal - celebratory modal with confetti animation.
 * Shown when teacher completes all onboarding steps.
 */
export const congratulationsModalGalleryEntry: GalleryEntry<CongratulationsModalProps> = {
  name: 'CongratulationsModal',
  importPath: congratulationsModalMeta.sourceId.split('#')[0],
  category: 'Modals & Overlays',
  id: congratulationsModalMeta.id,
  layoutSize: 'medium',
  meta: congratulationsModalMeta,
  variants: [
    {
      name: 'First Course Published',
      description: 'Celebration modal for first course',
      props: { isOpen: true, onClose: () => {}, teacherName: 'Nicholas' },
      status: 'prod',
      category: 'variant',
    },
  ],
}
