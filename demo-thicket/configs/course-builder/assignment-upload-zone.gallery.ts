import type { AssignmentUploadZone } from "../../platform/CourseBuilder/AssignmentUploadZone"
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { GalleryComponentMeta } from '../../platform/gallery/types'

type AssignmentUploadZoneProps = React.ComponentProps<typeof AssignmentUploadZone>

const assignmentUploadZoneMeta: GalleryComponentMeta = {
    id: 'course-builder/assignment-upload-zone',
  sourceId: '../../platform/CourseBuilder/AssignmentUploadZone#AssignmentUploadZone',
  status: 'archive',
}

export const assignmentUploadZoneGalleryEntry: GalleryEntry<AssignmentUploadZoneProps> = {
  name: 'AssignmentUploadZone',
  importPath: assignmentUploadZoneMeta.sourceId.split('#')[0],
  category: 'Course Management',
  id: 'course-builder/assignment-upload-zone',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Empty State',
      description: 'Upload zone with no files',
      props: {
        assignments: [],
        onAssignmentsChange: (assignments) => console.log('Assignments:', assignments),
        lessonId: 90001,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'With Assignments',
      description: 'Upload zone with multiple assignments',
      props: {
        assignments: [
          {
            id: 90001,
            lesson_id: 90001,
            filename: 'week1-assignment.pdf',
            original_name: 'week1-assignment.pdf',
            file_url: '/uploads/assignments/week1-assignment.pdf',
            file_type: 'application/pdf',
            file_size: 524288,
            uploaded_at: new Date().toISOString(),
          },
          {
            id: 90002,
            lesson_id: 90001,
            filename: 'starter-code.zip',
            original_name: 'starter-code.zip',
            file_url: '/uploads/assignments/starter-code.zip',
            file_type: 'application/zip',
            file_size: 1048576,
            uploaded_at: new Date().toISOString(),
          },
        ],
        onAssignmentsChange: (assignments) => console.log('Assignments:', assignments),
        lessonId: 90001,
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
