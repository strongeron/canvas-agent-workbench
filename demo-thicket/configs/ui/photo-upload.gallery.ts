import type { ComponentProps } from 'react'

import type { PhotoUpload } from '../../components/ui/photo-upload'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../platform/gallery/registry/types'

type PhotoUploadProps = ComponentProps<typeof PhotoUpload>

export const photoUploadMeta: GalleryComponentMeta = {
  id: 'ui/photo-upload',
  sourceId: '../../components/ui/photo-upload#PhotoUpload',
  status: 'prod',
}

export const photoUploadGalleryEntry: GalleryEntry<PhotoUploadProps> = {
  name: 'PhotoUpload',
  importPath: photoUploadMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: photoUploadMeta.id,
  layoutSize: 'medium',
  meta: photoUploadMeta,
  variants: [
    {
      name: 'Default Empty',
      description: 'Photo upload in empty state with name fallback',
      status: 'prod',
      category: 'state',
      props: {
        value: '',
        onChange: () => {},
        onError: () => {},
        name: 'John Doe',
        label: 'Profile Photo',
      }
    },
    {
      name: 'With Photo',
      description: 'Photo upload with preview state (data URL)',
      status: 'prod',
      category: 'state',
      props: {
        value: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzAwN2NmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UHJldmlldzwvdGV4dD48L3N2Zz4=',
        onChange: () => {},
        onError: () => {},
        name: 'Jane Smith',
        label: 'Profile Photo',
      }
    },
    {
      name: 'Custom Max Size (2MB)',
      description: 'Reduced maximum file size limit',
      status: 'prod',
      category: 'variant',
      props: {
        value: '',
        onChange: () => {},
        onError: () => {},
        maxSize: 2 * 1024 * 1024,
        name: 'User Name',
        label: 'Profile Photo',
        helperText: 'Square image recommended, at least 400x400px. Maximum 2MB.',
      }
    },
    {
      name: 'Small Preview Size',
      description: 'Extra small preview size (xs)',
      status: 'prod',
      category: 'variant',
      props: {
        value: '',
        onChange: () => {},
        onError: () => {},
        previewSize: 'xs',
        name: 'User',
        label: 'Avatar',
      }
    },
    {
      name: 'Medium Preview Size',
      description: 'Medium preview size (md)',
      status: 'prod',
      category: 'variant',
      props: {
        value: '',
        onChange: () => {},
        onError: () => {},
        previewSize: 'md',
        name: 'User Name',
        label: 'Profile Photo',
      }
    },
    {
      name: 'Extra Large Preview Size',
      description: 'Extra large preview size (xl)',
      status: 'prod',
      category: 'variant',
      props: {
        value: '',
        onChange: () => {},
        onError: () => {},
        previewSize: 'xl',
        name: 'User Name',
        label: 'Profile Photo',
      }
    },
    {
      name: 'Without Remove Button',
      description: 'Photo upload without remove button',
      status: 'prod',
      category: 'variant',
      props: {
        value: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzAwN2NmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UHJldmlldzwvdGV4dD48L3N2Zz4=',
        onChange: () => {},
        onError: () => {},
        showRemove: false,
        name: 'User Name',
        label: 'Profile Photo',
      }
    },
    {
      name: 'With Label and Helper Text',
      description: 'Photo upload with custom label and helper text',
      status: 'prod',
      category: 'variant',
      props: {
        value: '',
        onChange: () => {},
        onError: () => {},
        name: 'User Name',
        label: 'Profile Photo',
        helperText: 'Upload a professional headshot. Square image recommended, at least 400x400px. Maximum 5MB.',
      }
    },
  ]
}

