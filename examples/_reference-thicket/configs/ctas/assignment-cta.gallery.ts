import type { AssignmentCTAProps } from '@/platform/components/CTAs/AssignmentCTA'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'
import type { Assignment } from '@/types'

const sampleAssignment: Assignment = {
  id: 1,
  lesson_id: 90001,
  filename: 'assignment-1.pdf',
  original_name: 'assignment-1.pdf',
  file_url: 'https://example.com/assignment-1.pdf',
  file_type: 'application/pdf',
  file_size: 1024 * 100,
  uploaded_at: new Date().toISOString(),
}

export const assignmentCTAMeta: GalleryComponentMeta = {
  id: 'ctas/assignment-cta',
  sourceId: '@/platform/components/CTAs/AssignmentCTA#AssignmentCTA',
  status: 'wip',
}

export const assignmentCTAGalleryEntry: GalleryEntry<AssignmentCTAProps> = {
  id: assignmentCTAMeta.id,
  name: 'AssignmentCTA',
  importPath: assignmentCTAMeta.sourceId.split('#')[0],
  category: 'Domain CTAs',
  layoutSize: 'small',
  meta: assignmentCTAMeta,
  variants: [
    {
      name: 'Student - Download',
      description: 'Student view with download action',
      props: {
        assignment: sampleAssignment,
        role: 'student' as const,
        action: 'download' as const,
        onDownload: () => {},
      },
      status: 'wip',
      category: 'student-download',
    },
    {
      name: 'Student - Upload',
      description: 'Student view with upload action',
      props: {
        assignment: sampleAssignment,
        role: 'student' as const,
        action: 'upload' as const,
        onUpload: () => {},
      },
      status: 'wip',
      category: 'student-upload',
    },
    {
      name: 'Student - Submit',
      description: 'Student view with submit action',
      props: {
        assignment: sampleAssignment,
        role: 'student' as const,
        action: 'submit' as const,
        onSubmit: () => {},
      },
      status: 'wip',
      category: 'student-submit',
    },
    {
      name: 'Teacher - Download',
      description: 'Teacher view with download action',
      props: {
        assignment: sampleAssignment,
        role: 'teacher' as const,
        action: 'download' as const,
        onDownload: () => {},
      },
      status: 'wip',
      category: 'teacher-download',
    },
    {
      name: 'Teacher - View',
      description: 'Teacher view with view action',
      props: {
        assignment: sampleAssignment,
        role: 'teacher' as const,
        action: 'view' as const,
      },
      status: 'wip',
      category: 'teacher-view',
    },
  ],
}

