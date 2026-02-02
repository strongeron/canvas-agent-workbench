import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

interface CourseTabAnnouncementsProps {
  announcements: {
    id: number
    title: string
    message: string
    created_at: string
    author_name: string
    author_avatar?: string
  }[]
  onCreateAnnouncement: () => void
}

export const teacherCourseTabAnnouncementsMeta: GalleryComponentMeta = {
  id: 'teacher/course-tab-announcements',
  sourceId: '@thicket/platform/Teacher/CourseTabAnnouncements#CourseTabAnnouncementsTeacher',
  status: 'prod',
}

export const teacherCourseTabAnnouncementsGalleryEntry: GalleryEntry<CourseTabAnnouncementsProps> = {
  name: 'TeacherCourseTabAnnouncements',
  importPath: teacherCourseTabAnnouncementsMeta.sourceId.split('#')[0],
  category: 'Teacher',
  id: teacherCourseTabAnnouncementsMeta.id,
  layoutSize: 'large',
  meta: teacherCourseTabAnnouncementsMeta,
  variants: [
    {
      name: 'With Announcements',
      description: 'Teacher view of course announcements',
      props: {
        announcements: [
          {
            id: 1,
            title: "Welcome to the Course!",
            message: "We're excited to have you here. Please review the syllabus.",
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            author_name: "Dr. Emily Watson",
            author_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
          },
        ],
        onCreateAnnouncement: () => {},
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Empty State',
      description: 'No announcements yet',
      props: {
        announcements: [],
        onCreateAnnouncement: () => {},
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
