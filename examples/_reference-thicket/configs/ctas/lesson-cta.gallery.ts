import type { LessonCTAProps } from '@/platform/components/CTAs/LessonCTA'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'
import { GALLERY_LESSONS } from '../mocks/galleryData'

const liveLesson = {
  id: 1,
  courseId: 90001,
  courseTitle: 'Introduction to Web Development',
  courseCoverUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
  lessonId: 90001,
  lessonTitle: 'Getting Started with HTML',
  lessonDescription: 'Learn the basics of HTML structure and semantic elements',
  lessonPosition: 1,
  scheduledAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  wherebyRoomUrl: 'https://example.whereby.com/lesson-90001',
  hostWherebyUrl: 'https://example.whereby.com/host/lesson-90001',
  topics: ['HTML5 Semantic Elements', 'Document Structure', 'Accessibility Basics'],
  isCompleted: false,
  isLocked: false,
  userTimezone: 'America/New_York',
}

const lockedLesson = {
  ...liveLesson,
  id: 2,
  lessonId: 90002,
  isLocked: true,
}

const upcomingLesson = {
  ...liveLesson,
  id: 3,
  lessonId: 90003,
  scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  wherebyRoomUrl: undefined,
}

const pastLessonWithRecording = {
  ...liveLesson,
  id: 4,
  lessonId: 90004,
  scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  recordingUrl: 'https://example.whereby.com/recording/lesson-90004',
  isCompleted: true,
}

const pastLessonNoRecording = {
  ...liveLesson,
  id: 5,
  lessonId: 90005,
  scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  recordingUrl: undefined,
  isCompleted: true,
}

export const lessonCTAMeta: GalleryComponentMeta = {
  id: 'ctas/lesson-cta',
  sourceId: '@/platform/components/CTAs/LessonCTA#LessonCTA',
  status: 'prod',
}

export const lessonCTAGalleryEntry: GalleryEntry<LessonCTAProps> = {
  id: lessonCTAMeta.id,
  name: 'LessonCTA',
  importPath: lessonCTAMeta.sourceId.split('#')[0],
  category: 'Domain CTAs',
  layoutSize: 'small',
  meta: lessonCTAMeta,
  variants: [
    {
      name: 'Student - Live Session',
      description: 'Student view of live lesson with join button',
      props: {
        lesson: liveLesson,
        role: 'student' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'student-live',
    },
    {
      name: 'Student - Locked',
      description: 'Student view of locked lesson',
      props: {
        lesson: lockedLesson,
        role: 'student' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'student-locked',
    },
    {
      name: 'Student - Upcoming',
      description: 'Student view of upcoming lesson',
      props: {
        lesson: upcomingLesson,
        role: 'student' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'student-upcoming',
    },
    {
      name: 'Student - Upcoming (Schedule Mode)',
      description: 'Student view of upcoming lesson in schedule mode',
      props: {
        lesson: upcomingLesson,
        role: 'student' as const,
        mode: 'schedule' as const,
      },
      status: 'prod',
      category: 'student-upcoming',
    },
    {
      name: 'Student - Completed',
      description: 'Student view of completed lesson',
      props: {
        lesson: {
          ...liveLesson,
          id: 6,
          lessonId: 90006,
          scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          isCompleted: true,
        },
        role: 'student' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'student-completed',
    },
    {
      name: 'Student - Past with Recording',
      description: 'Student view of past lesson with recording available',
      props: {
        lesson: pastLessonWithRecording,
        role: 'student' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'student-past',
    },
    {
      name: 'Student - Past no Recording',
      description: 'Student view of past lesson without recording',
      props: {
        lesson: pastLessonNoRecording,
        role: 'student' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'student-past',
    },
    {
      name: 'Teacher - Live with Host URL',
      description: 'Teacher view of live lesson with host URL',
      props: {
        lesson: liveLesson,
        role: 'teacher' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'teacher-live',
    },
    {
      name: 'Teacher - Live no Host URL',
      description: 'Teacher view of live lesson without host URL',
      props: {
        lesson: {
          ...liveLesson,
          hostWherebyUrl: undefined,
        },
        role: 'teacher' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'teacher-live',
    },
    {
      name: 'Teacher - Upcoming',
      description: 'Teacher view of upcoming lesson',
      props: {
        lesson: upcomingLesson,
        role: 'teacher' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'teacher-upcoming',
    },
    {
      name: 'Teacher - Upcoming (Schedule Mode)',
      description: 'Teacher view of upcoming lesson in schedule mode showing "Upcoming Session" badge',
      props: {
        lesson: upcomingLesson,
        role: 'teacher' as const,
        mode: 'schedule' as const,
      },
      status: 'prod',
      category: 'teacher-upcoming',
    },
    {
      name: 'Teacher - Past with Recording',
      description: 'Teacher view of past lesson with recording',
      props: {
        lesson: pastLessonWithRecording,
        role: 'teacher' as const,
        mode: 'dashboard' as const,
      },
      status: 'prod',
      category: 'teacher-past',
    },
  ],
}

