import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

interface CourseTabStudentsProps {
  students: {
    id: number
    name: string
    email: string
    avatar_url?: string
    progress: number
    last_activity: string
  }[]
}

export const courseTabStudentsMeta: GalleryComponentMeta = {
  id: 'teacher/course-tab-students',
  sourceId: '@thicket/platform/Teacher/CourseTabStudents#CourseTabStudents',
  status: 'prod',
}

export const courseTabStudentsGalleryEntry: GalleryEntry<CourseTabStudentsProps> = {
  name: 'CourseTabStudents',
  importPath: courseTabStudentsMeta.sourceId.split('#')[0],
  category: 'Teacher',
  id: courseTabStudentsMeta.id,
  layoutSize: 'large',
  meta: courseTabStudentsMeta,
  variants: [
    {
      name: 'With Students',
      description: 'List of enrolled students',
      props: {
        students: [
          {
            id: 90001,
            name: "Alex Thompson",
            email: "alex.thompson@example.com",
            avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
            progress: 75,
            last_activity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 90002,
            name: "Jordan Martinez",
            email: "jordan.martinez@example.com",
            avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
            progress: 42,
            last_activity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Empty State',
      description: 'No enrolled students yet',
      props: {
        students: [],
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
