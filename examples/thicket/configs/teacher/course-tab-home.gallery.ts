import type { ComponentProps } from 'react'

import type { CourseTabHomeTeacher } from '@/platform/components/Teacher/CourseTabHome'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

import { GALLERY_COURSES } from '../mocks/galleryData'

type CourseTabHomeProps = ComponentProps<typeof CourseTabHomeTeacher>

export const teacherCourseTabHomeMeta: GalleryComponentMeta = {
  id: 'teacher/course-tab-home',
  sourceId: '@/platform/components/Teacher/CourseTabHome#CourseTabHomeTeacher',
  status: 'prod',
}

export const teacherCourseTabHomeGalleryEntry: GalleryEntry<CourseTabHomeProps> = {
  name: 'CourseTabHomeTeacher',
  importPath: teacherCourseTabHomeMeta.sourceId.split('#')[0],
  category: 'Teacher Course Management',
  id: teacherCourseTabHomeMeta.id,
  layoutSize: 'large',
  meta: teacherCourseTabHomeMeta,
  variants: [
    {
      name: 'With Live Lesson',
      status: 'prod',
      category: 'state',
      description: 'Shows active live lesson banner for instructor to join',
      props: {
        course: {
          ...GALLERY_COURSES[0],
          curriculum: [
            {
              id: 90001,
              title: 'Introduction to Advanced Topics',
              description: 'Get started with the fundamentals',
              scheduled_at: new Date().toISOString(),
              duration_minutes: 60,
              order: 1,
              type: 'live_session' as const,
              status: 'published' as const,
            },
          ],
          host_whereby_url: 'https://whereby.com/instructor-room',
        },
        enrolledStudentsCount: 24,
        averageProgress: 42,
        userTimezone: 'America/New_York',
      },
    },
    {
      name: 'With Next Lesson',
      status: 'prod',
      category: 'state',
      description: 'Displays next scheduled lesson information',
      props: {
        course: {
          ...GALLERY_COURSES[0],
          curriculum: [
            {
              id: 90002,
              title: 'Week 2: Core Concepts',
              description: 'Deep dive into the essential principles',
              scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              duration_minutes: 90,
              order: 2,
              type: 'live_session' as const,
              status: 'published' as const,
            },
          ],
        },
        enrolledStudentsCount: 18,
        averageProgress: 65,
        userTimezone: 'America/Los_Angeles',
      },
    },
    {
      name: 'With Announcement',
      status: 'prod',
      category: 'variant',
      description: 'Shows latest course announcement to students',
      props: {
        course: {
          ...GALLERY_COURSES[0],
          curriculum: [],
        },
        enrolledStudentsCount: 32,
        averageProgress: 78,
        userTimezone: 'UTC',
      },
    },
    {
      name: 'Full Overview',
      status: 'prod',
      category: 'layout',
      description: 'Complete course home with stats and objectives',
      props: {
        course: {
          ...GALLERY_COURSES[1],
          learning_objectives: [
            'Understand fundamental concepts and principles',
            'Apply theoretical knowledge to practical scenarios',
            'Develop critical thinking and problem-solving skills',
            'Collaborate effectively with peers',
          ],
        },
        enrolledStudentsCount: 45,
        averageProgress: 55,
        userTimezone: 'America/Chicago',
      },
    },
  ],
}
