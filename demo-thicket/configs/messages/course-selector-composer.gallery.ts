import type { GalleryEntry } from '../../platform/gallery/registry/types'
import type { GalleryComponentMeta } from '../../platform/gallery/types'

import { GALLERY_COURSES } from '../../platform/gallery/mocks/galleryData'

interface Course {
  id: number
  name?: string
  title?: string
  enrolled_students?: number
  instructor?: {
    id: number
    name: string
    avatar_url: string
  }
}

interface CourseSelectorProps {
  courses: Course[]
  selectedCourseId: number | null
  onCourseChange: (id: number | null) => void
  messageType?: 'individual' | 'announcement'
  disabled?: boolean
  showEnrolledCount?: boolean
}

const courseSelectorComposerMeta: GalleryComponentMeta = {
    id: 'messages/course-selector-composer',
  sourceId: '../../platform/MessageComposer/CourseSelector#CourseSelector',
  status: 'archive',
}

export const courseSelectorComposerGalleryEntry: GalleryEntry<CourseSelectorProps> = {
  id: 'messages/course-selector-composer',
  name: 'CourseSelector (Composer)',
  importPath: courseSelectorComposerMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  variants: [
    {
      name: 'No Course Selected',
      description: 'Course selector with no selection made',
      props: {
        courses: GALLERY_COURSES.slice(0, 3).map((c) => ({
          id: c.id,
          name: c.title,
          enrolled_students: 15,
        })),
        selectedCourseId: null,
        onCourseChange: () => console.log('Course changed'),
        messageType: 'individual',
        disabled: false,
        showEnrolledCount: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Course Selected with Preview',
      description: 'Course selected showing preview card with enrollment count',
      props: {
        courses: GALLERY_COURSES.slice(0, 3).map((c) => ({
          id: c.id,
          name: c.title,
          enrolled_students: 20,
        })),
        selectedCourseId: GALLERY_COURSES[0]?.id || 90001,
        onCourseChange: () => console.log('Course changed'),
        messageType: 'individual',
        disabled: false,
        showEnrolledCount: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'With Enrollment Count (Teacher View)',
      description: 'Courses showing enrollment numbers in dropdown',
      props: {
        courses: GALLERY_COURSES.slice(0, 4).map((c, i) => ({
          id: c.id,
          name: c.title,
          enrolled_students: 10 + i * 5,
        })),
        selectedCourseId: null,
        onCourseChange: () => console.log('Course changed'),
        messageType: 'individual',
        disabled: false,
        showEnrolledCount: true,
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Empty Courses List',
      description: 'No courses available for selection',
      props: {
        courses: [],
        selectedCourseId: null,
        onCourseChange: () => console.log('Course changed'),
        messageType: 'individual',
        disabled: false,
        showEnrolledCount: false,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Announcement Message Type',
      description: 'Course selector in announcement mode',
      props: {
        courses: GALLERY_COURSES.slice(0, 3).map((c) => ({
          id: c.id,
          name: c.title,
          enrolled_students: 18,
        })),
        selectedCourseId: GALLERY_COURSES[1]?.id || 90002,
        onCourseChange: () => console.log('Course changed'),
        messageType: 'announcement',
        disabled: false,
        showEnrolledCount: true,
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Disabled State',
      description: 'Course selector in disabled state',
      props: {
        courses: GALLERY_COURSES.slice(0, 2).map((c) => ({
          id: c.id,
          name: c.title,
          enrolled_students: 12,
        })),
        selectedCourseId: GALLERY_COURSES[0]?.id || 90001,
        onCourseChange: () => console.log('Course changed'),
        messageType: 'individual',
        disabled: true,
        showEnrolledCount: true,
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
