import type { ComponentEntry } from '../../registry/types'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

const sonnerMeta: GalleryComponentMeta = {
  id: '90100',
  sourceId: '@thicket/components/ui/sonner#Toaster',
  status: 'prod',
}

export const sonnerGalleryEntry: ComponentEntry = {
  name: 'Toaster (Sonner)',
  category: 'Base UI',
  importPath: sonnerMeta.sourceId.split('#')[0],
  variants: [
    {
      name: 'Success Toast',
      description: 'Success notification with green styling and check icon',
      status: 'prod',
      category: 'variant',
      props: {
        __useSonnerPreview: true,
        toastType: 'success',
        message: 'Your changes have been saved successfully',
      },
    },
    {
      name: 'Error Toast',
      description: 'Error notification with red styling',
      status: 'prod',
      category: 'variant',
      props: {
        __useSonnerPreview: true,
        toastType: 'error',
        message: 'Failed to save changes. Please try again.',
      },
    },
    {
      name: 'Warning Toast',
      description: 'Warning notification with yellow styling',
      status: 'prod',
      category: 'variant',
      props: {
        __useSonnerPreview: true,
        toastType: 'warning',
        message: 'Your session will expire in 5 minutes',
      },
    },
    {
      name: 'Info Toast',
      description: 'Informational notification with blue styling',
      status: 'prod',
      category: 'variant',
      props: {
        __useSonnerPreview: true,
        toastType: 'info',
        message: 'A new version of the app is available',
      },
    },
    {
      name: 'Loading Toast',
      description: 'Loading indicator with spinning icon',
      status: 'prod',
      category: 'variant',
      props: {
        __useSonnerPreview: true,
        toastType: 'loading',
        message: 'Saving your changes...',
      },
    },
    {
      name: 'Toast with Description',
      description: 'Toast with title and additional description text',
      status: 'prod',
      category: 'state',
      props: {
        __useSonnerPreview: true,
        toastType: 'success',
        message: 'Course Published',
        description: 'Your course is now live and visible to students.',
      },
    },
    {
      name: 'Toast with Action',
      description: 'Toast with an action button',
      status: 'prod',
      category: 'state',
      props: {
        __useSonnerPreview: true,
        toastType: 'info',
        message: 'Message sent',
        action: { label: 'Undo', onClick: 'undo' },
      },
    },
    {
      name: 'Promise Toast',
      description: 'Toast that shows loading/success/error states for async operations',
      status: 'prod',
      category: 'state',
      props: {
        __useSonnerPreview: true,
        toastType: 'promise',
        promiseConfig: {
          loading: 'Publishing course...',
          success: 'Course published successfully!',
          error: 'Failed to publish course',
        },
      },
    },
    {
      name: 'Stacked Toasts',
      description: 'Multiple toasts stacked with hover expansion',
      status: 'prod',
      category: 'state',
      props: {
        __useSonnerPreview: true,
        toastType: 'multiple',
        toasts: [
          { type: 'success', message: 'Course published successfully' },
          { type: 'info', message: 'Students have been notified' },
          { type: 'warning', message: 'Payment setup incomplete' },
        ],
      },
    },
  ],
}
