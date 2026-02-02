import type { ComponentEntry } from '../../registry/types'
import type { GalleryComponentMeta } from '../../platform/gallery/types'

const toastMeta: GalleryComponentMeta = {
  id: '90001',
  sourceId: '../../platform/_archive/toast#Toast',
  status: 'archive',
}

export const toastGalleryEntry: ComponentEntry = {
  name: 'Legacy ToastContainer',
  category: 'Base UI',
  importPath: toastMeta.sourceId.split('#')[0],
  variants: [
    {
      name: 'Success Toast',
      description: 'Success notification with green styling',
      status: 'archive',
      category: 'variant',
      props: {
        __useToastPreview: true,
        toasts: [
          {
            id: '90001',
            message: 'Your changes have been saved successfully',
            variant: 'success',
            duration: 5000,
          },
        ],
      },
    },
    {
      name: 'Error Toast',
      description: 'Error notification with red styling',
      status: 'archive',
      category: 'variant',
      props: {
        __useToastPreview: true,
        toasts: [
          {
            id: '90002',
            message: 'Failed to save changes. Please try again.',
            variant: 'error',
            duration: 5000,
          },
        ],
      },
    },
    {
      name: 'Warning Toast',
      description: 'Warning notification with yellow styling',
      status: 'archive',
      category: 'variant',
      props: {
        __useToastPreview: true,
        toasts: [
          {
            id: '90003',
            message: 'Your session will expire in 5 minutes',
            variant: 'warning',
            duration: 5000,
          },
        ],
      },
    },
    {
      name: 'Info Toast',
      description: 'Informational notification with blue styling',
      status: 'archive',
      category: 'variant',
      props: {
        __useToastPreview: true,
        toasts: [
          {
            id: '90004',
            message: 'A new version of the app is available',
            variant: 'info',
            duration: 5000,
          },
        ],
      },
    },
    {
      name: 'Multiple Toasts',
      description: 'Multiple notifications stacked vertically',
      status: 'archive',
      category: 'state',
      props: {
        __useToastPreview: true,
        toasts: [
          {
            id: '90005',
            message: 'Course published successfully',
            variant: 'success',
            duration: 5000,
          },
          {
            id: '90006',
            message: 'Students have been notified',
            variant: 'info',
            duration: 5000,
          },
          {
            id: '90007',
            message: 'Payment setup incomplete',
            variant: 'warning',
            duration: 5000,
          },
        ],
      },
    },
    {
      name: 'Long Message',
      description: 'Toast with longer notification text',
      status: 'archive',
      category: 'state',
      props: {
        __useToastPreview: true,
        toasts: [
          {
            id: '90008',
            message:
              'Your profile has been updated with the latest information. All students in your courses will see the updated details on your instructor card.',
            variant: 'success',
            duration: 5000,
          },
        ],
      },
    },
  ],
}
