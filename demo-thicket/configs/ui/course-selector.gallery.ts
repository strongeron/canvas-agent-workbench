import type { CourseSelectorProps } from "@thicket/components/ui/course-selector"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export const courseSelectorMeta: GalleryComponentMeta = {
  id: 'ui/course-selector',
  sourceId: '@thicket/components/ui/course-selector#CourseSelector',
  status: 'prod',
}

export const courseSelectorGalleryEntry: GalleryEntry<CourseSelectorProps> = {
  name: 'CourseSelector',
  importPath: courseSelectorMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: courseSelectorMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: courseSelectorMeta,
  variants: [
    {
      name: 'All Courses Selected',
      description: 'Course selector showing "All Courses" state',
      props: { courses: [{ id: 1, name: 'Renaissance Art History' }, { id: 2, name: 'Modern Architecture' }, { id: 3, name: 'Introduction to Physics' }], selectedCourseId: null, onSelectCourse: () => {}, placeholder: 'Select course', allCoursesLabel: 'All Courses' },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Specific Course Selected',
      description: 'Course selector with a specific course selected',
      props: { courses: [{ id: 1, name: 'Renaissance Art History' }, { id: 2, name: 'Modern Architecture' }, { id: 3, name: 'Introduction to Physics' }], selectedCourseId: 1, onSelectCourse: () => {}, placeholder: 'Select course' },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Single Course Available',
      description: 'Course selector with only one course option',
      props: { courses: [{ id: 1, name: 'Advanced Calculus' }], selectedCourseId: 1, onSelectCourse: () => {}, placeholder: 'Select course' },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Empty Course List',
      description: 'Course selector with no courses available',
      props: { courses: [], selectedCourseId: null, onSelectCourse: () => {}, placeholder: 'No courses available' },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Many Courses (Scrollable)',
      description: 'Course selector with long list requiring scroll',
      props: { courses: [{ id: 1, name: 'Renaissance Art History' }, { id: 2, name: 'Modern Architecture' }, { id: 3, name: 'Introduction to Physics' }, { id: 4, name: 'Advanced Calculus' }, { id: 5, name: 'World Literature' }, { id: 6, name: 'Organic Chemistry' }, { id: 7, name: 'Computer Programming 101' }, { id: 8, name: 'Classical Music Theory' }, { id: 9, name: 'Modern Philosophy' }, { id: 10, name: 'Environmental Science' }], selectedCourseId: 5, onSelectCourse: () => {}, placeholder: 'Select course' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Custom "All" Label',
      description: 'Course selector with custom label for all courses option',
      props: { courses: [{ id: 1, name: 'Mathematics' }, { id: 2, name: 'Science' }], selectedCourseId: null, onSelectCourse: () => {}, placeholder: 'Select course', allCoursesLabel: 'View All My Courses' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Second Course Selected',
      description: 'Course selector with second option selected',
      props: { courses: [{ id: 1, name: 'Introduction to Psychology' }, { id: 2, name: 'Cognitive Neuroscience' }, { id: 3, name: 'Behavioral Economics' }], selectedCourseId: 2, onSelectCourse: () => {}, placeholder: 'Select course' },
      status: 'archive',
      category: 'state',
    },
  ],
}
