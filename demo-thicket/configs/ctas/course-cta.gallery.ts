import type { CourseCTAProps } from '../../platform/CTAs/CourseCTA'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'
import { GALLERY_COURSES, GALLERY_ENROLLED_COURSES } from '../../platform/gallery/mocks/galleryData'

const publishedCourse = GALLERY_COURSES[0]
const waitlistCourse = {
  ...GALLERY_COURSES[0],
  id: 90004,
  state: 'waitlist' as const,
}

const enrolledCourse = GALLERY_ENROLLED_COURSES[0]

export const courseCTAMeta: GalleryComponentMeta = {
  id: 'ctas/course-cta',
  sourceId: '../../platform/CTAs/CourseCTA#CourseCTA',
  status: 'prod',
}

export const courseCTAGalleryEntry: GalleryEntry<CourseCTAProps> = {
  id: courseCTAMeta.id,
  name: 'CourseCTA',
  importPath: courseCTAMeta.sourceId.split('#')[0],
  category: 'Domain CTAs',
  layoutSize: 'small',
  meta: courseCTAMeta,
  variants: [
    {
      name: 'Public - Published Course (Enroll)',
      description: 'Public view of published course with enroll button',
      props: {
        course: publishedCourse,
        role: 'public' as const,
        variant: 'card' as const,
      },
      status: 'prod',
      category: 'public-published',
    },
    {
      name: 'Public - Waitlist Course',
      description: 'Public view of waitlist course with join waitlist button',
      props: {
        course: waitlistCourse,
        role: 'public' as const,
        variant: 'card' as const,
      },
      status: 'prod',
      category: 'public-waitlist',
    },
    {
      name: 'Student - Enrolled (View Course)',
      description: 'Student view of enrolled course with view course button',
      props: {
        course: enrolledCourse.course,
        enrollment: enrolledCourse.enrollment,
        role: 'student' as const,
        variant: 'card' as const,
      },
      status: 'prod',
      category: 'student-enrolled',
    },
    {
      name: 'Student - Not Enrolled (Enroll)',
      description: 'Student view of course not enrolled with enroll button',
      props: {
        course: publishedCourse,
        role: 'student' as const,
        variant: 'card' as const,
        authenticated_user: { id: 90001 },
        is_enrolled: false,
      },
      status: 'prod',
      category: 'student-not-enrolled',
    },
    {
      name: 'Sidebar - Published Course',
      description: 'Sidebar variant for published course',
      props: {
        course: publishedCourse,
        role: 'public' as const,
        variant: 'sidebar' as const,
        authenticated_user: { id: 90001 },
        is_enrolled: false,
      },
      status: 'prod',
      category: 'sidebar',
    },
    {
      name: 'Table - Enrolled Course',
      description: 'Table variant for enrolled course',
      props: {
        course: enrolledCourse.course,
        enrollment: enrolledCourse.enrollment,
        role: 'student' as const,
        variant: 'table' as const,
      },
      status: 'prod',
      category: 'table',
    },
    {
      name: 'Teacher - No Button',
      description: 'Teacher view shows no button',
      props: {
        course: publishedCourse,
        role: 'teacher' as const,
        variant: 'card' as const,
      },
      status: 'prod',
      category: 'teacher',
    },
  ],
}

