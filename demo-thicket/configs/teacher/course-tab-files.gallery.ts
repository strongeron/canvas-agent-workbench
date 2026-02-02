import type { ComponentProps } from 'react'

import type { CourseTabFilesTeacher } from '@thicket/platform/Teacher/CourseTabFiles'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'

type CourseTabFilesProps = ComponentProps<typeof CourseTabFilesTeacher>

export const teacherCourseTabFilesMeta: GalleryComponentMeta = {
  id: 'teacher/course-tab-files',
  sourceId: '@thicket/platform/Teacher/CourseTabFiles#CourseTabFilesTeacher',
  status: 'prod',
}

export const teacherCourseTabFilesGalleryEntry: GalleryEntry<CourseTabFilesProps> = {
  name: 'CourseTabFilesTeacher',
  importPath: teacherCourseTabFilesMeta.sourceId.split('#')[0],
  // Note: Component is exported as CourseTabFilesTeacher
  category: 'Teacher Course Management',
  id: teacherCourseTabFilesMeta.id,
  layoutSize: 'large',
  meta: teacherCourseTabFilesMeta,
  variants: [
    {
      name: 'Empty State',
      status: 'prod',
      category: 'state',
      description: 'Shows empty state when no files have been uploaded',
      props: {
        courseId: 90001,
        instructorId: 1,
        instructorName: 'Sarah Chen',
      },
    },
    {
      name: 'With Files',
      status: 'prod',
      category: 'state',
      description: 'Displays uploaded files with management actions',
      props: {
        courseId: 1,
        instructorId: 1,
        instructorName: 'Sarah Chen',
      },
    },
    {
      name: 'Upload Zone Focus',
      status: 'prod',
      category: 'variant',
      description: 'Emphasizes the file upload area for new uploads',
      props: {
        courseId: 90002,
        instructorId: 1,
        instructorName: 'Sarah Chen',
      },
    },
  ],
}
