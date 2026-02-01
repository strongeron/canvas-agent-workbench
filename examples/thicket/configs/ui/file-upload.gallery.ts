import type { ComponentProps } from 'react'

import type { FileUpload } from '@/components/ui/file-upload'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

type FileUploadProps = ComponentProps<typeof FileUpload>

export const fileUploadMeta: GalleryComponentMeta = {
  id: 'ui/file-upload',
  sourceId: '@/components/ui/file-upload#FileUpload',
  status: 'prod',
}

export const fileUploadGalleryEntry: GalleryEntry<FileUploadProps> = {
  name: 'FileUpload',
  importPath: fileUploadMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: fileUploadMeta.id,
  layoutSize: 'medium',
  meta: fileUploadMeta,
  variants: [
    {
      name: 'Default Empty',
      description: 'File upload in empty state, accepts PDF/DOC',
      status: 'prod',
      category: 'state',
      props: {
        label: 'Upload Document',
        onChange: () => {}
      }
    },
    {
      name: 'With Custom Helper Text',
      description: 'Custom helper text and file type restrictions',
      status: 'prod',
      category: 'variant',
      props: {
        label: 'Course Syllabus',
        helperText: 'PDF or Word document (max 5MB)',
        onChange: () => {}
      }
    },
    {
      name: 'PDF Only',
      description: 'Restricted to PDF files only',
      status: 'prod',
      category: 'variant',
      props: {
        label: 'Upload PDF',
        accept: '.pdf',
        helperText: 'PDF files only (max 5MB)',
        onChange: () => {}
      }
    },
    {
      name: 'Images Only',
      description: 'Image file upload with icon preview',
      status: 'prod',
      category: 'variant',
      props: {
        label: 'Profile Photo',
        accept: 'image/*',
        helperText: 'JPG, PNG, or GIF (max 5MB)',
        onChange: () => {}
      }
    },
    {
      name: 'Error State',
      description: 'Upload with validation error message',
      status: 'prod',
      category: 'state',
      props: {
        label: 'Upload Resume',
        error: 'File must be less than 5MB',
        onChange: () => {}
      }
    },
    {
      name: 'Small Max Size (2MB)',
      description: 'Reduced maximum file size limit',
      status: 'prod',
      category: 'variant',
      props: {
        label: 'Upload Document',
        maxSize: 2 * 1024 * 1024,
        helperText: 'PDF or DOC (max 2MB)',
        onChange: () => {}
      }
    },
    {
      name: 'File Selected State',
      description: 'FileUpload with file selected. Cannot be rendered in gallery (requires real File object). Use component directly to test file selection, drag-and-drop, and removal interactions.',
      status: 'prod',
      category: 'state',
      props: {
        __skipRender: true
      }
    }
  ]
}
