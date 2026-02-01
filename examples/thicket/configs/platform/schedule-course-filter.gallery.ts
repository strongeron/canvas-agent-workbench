import type { ScheduleCourseFilter } from "@/platform/components/ScheduleCourseFilter"
import type { GalleryComponentMeta } from "../registry/types"
import type { GalleryEntry } from "../registry/types"

type ScheduleCourseFilterProps = React.ComponentProps<typeof ScheduleCourseFilter>

export const scheduleCourseFilterMeta: GalleryComponentMeta = {
  id: 'platform/schedule-course-filter',
  sourceId: '@/platform/components/ScheduleCourseFilter#ScheduleCourseFilter',
  status: 'prod',
}

export const scheduleCourseFilterGalleryEntry: GalleryEntry<ScheduleCourseFilterProps> = {
  name: 'ScheduleCourseFilter',
  importPath: scheduleCourseFilterMeta.sourceId.split('#')[0],
  category: 'Filtering & Sorting',
  id: scheduleCourseFilterMeta.id,
  layoutSize: 'full',
  meta: scheduleCourseFilterMeta,
  variants: [
    {
      name: 'All Courses (No Filter)',
      description: 'Default state showing all courses',
      props: {
        value: null,
        onChange: (courseId) => console.log('Changed to:', courseId),
        courseOptions: [
          { id: 90001, title: 'Advanced React Development' },
          { id: 90002, title: 'Full Stack JavaScript' },
          { id: 90003, title: 'TypeScript Mastery' },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Single Course Selected',
      description: 'Filtered to show one specific course',
      props: {
        value: 90001,
        onChange: (courseId) => console.log('Changed to:', courseId),
        courseOptions: [
          { id: 90001, title: 'Advanced React Development' },
          { id: 90002, title: 'Full Stack JavaScript' },
          { id: 90003, title: 'TypeScript Mastery' },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Many Courses',
      description: 'Filter dropdown with many course options',
      props: {
        value: 90003,
        onChange: (courseId) => console.log('Changed to:', courseId),
        courseOptions: [
          { id: 90001, title: 'Advanced React Development' },
          { id: 90002, title: 'Full Stack JavaScript' },
          { id: 90003, title: 'TypeScript Mastery' },
          { id: 90004, title: 'Introduction to Web Development' },
          { id: 90005, title: 'Database Design Fundamentals' },
          { id: 90006, title: 'API Development with Node.js' },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Long Course Title',
      description: 'Selected course with truncated long title',
      props: {
        value: 90001,
        onChange: (courseId) => console.log('Changed to:', courseId),
        courseOptions: [
          { id: 90001, title: 'Advanced React Development with Modern Hooks and Server Components' },
          { id: 90002, title: 'Full Stack JavaScript' },
        ],
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Single Course (Hidden)',
      description: 'Filter not shown when only one course (returns null)',
      props: {
        value: null,
        onChange: (courseId) => console.log('Changed to:', courseId),
        courseOptions: [
          { id: 90001, title: 'Advanced React Development' },
        ],
        __skipRender: true,
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
