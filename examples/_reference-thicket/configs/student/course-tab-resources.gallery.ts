import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"

interface CourseTabResourcesProps {
  resources: {
    id: number
    title: string
    description: string
    url: string
    type: "link" | "video" | "document"
  }[]
}

export const courseTabResourcesMeta: GalleryComponentMeta = {
  id: 'student/course-tab-resources',
  sourceId: '@/platform/components/Student/CourseTabResources#CourseTabResources',
  status: 'prod',
}

export const courseTabResourcesGalleryEntry: GalleryEntry<CourseTabResourcesProps> = {
  name: 'CourseTabResources',
  importPath: courseTabResourcesMeta.sourceId.split('#')[0],
  category: 'Student',
  id: courseTabResourcesMeta.id,
  layoutSize: 'large',
  meta: courseTabResourcesMeta,
  variants: [
    {
      name: 'With Resources',
      description: 'List of course resources',
      props: {
        resources: [
          {
            id: 1,
            title: "Course Syllabus",
            description: "Complete course outline and schedule",
            url: "/resources/syllabus.pdf",
            type: "document",
          },
          {
            id: 2,
            title: "MDN Web Docs",
            description: "Comprehensive web development documentation",
            url: "https://developer.mozilla.org",
            type: "link",
          },
          {
            id: 3,
            title: "Intro to JavaScript",
            description: "Video tutorial covering basics",
            url: "https://youtube.com/watch?v=example",
            type: "video",
          },
        ],
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Empty State',
      description: 'No resources available',
      props: {
        resources: [],
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
