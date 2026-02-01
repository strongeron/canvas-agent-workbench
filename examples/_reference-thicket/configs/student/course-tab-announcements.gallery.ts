import type { ComponentProps } from "react"
import type { GalleryComponentMeta } from '../registry/types'

import type { CourseTabAnnouncementsStudent } from "@/platform/components/Student/CourseTabAnnouncements"
import type { GalleryEntry } from "../registry/types"

type CourseTabAnnouncementsProps = ComponentProps<typeof CourseTabAnnouncementsStudent>

export const courseTabAnnouncementsMeta: GalleryComponentMeta = {
  id: 'student/course-tab-announcements',
  sourceId: '@/platform/components/Student/CourseTabAnnouncements#CourseTabAnnouncementsStudent',
  status: 'prod',
}

export const courseTabAnnouncementsGalleryEntry: GalleryEntry<CourseTabAnnouncementsProps> = {
  name: 'CourseTabAnnouncements',
  importPath: courseTabAnnouncementsMeta.sourceId.split('#')[0],
  category: 'Student',
  id: courseTabAnnouncementsMeta.id,
  layoutSize: 'large',
  meta: courseTabAnnouncementsMeta,
  variants: [
    {
      name: 'With Announcements',
      description: 'List of course announcements (loads from data store)',
      props: {
        courseId: 90001,
        studentId: 90001,
        courseTitle: "Introduction to Web Development",
        courseCoverUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Empty State',
      description: 'No announcements yet',
      props: {
        courseId: 99999,
        studentId: 90001,
        courseTitle: "New Course",
        courseCoverUrl: undefined,
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
