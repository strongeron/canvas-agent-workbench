import type { CurriculumBuilder } from "@/platform/components/CourseBuilder/CurriculumBuilder"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from "../registry/types"

type CurriculumBuilderProps = React.ComponentProps<typeof CurriculumBuilder>

const curriculumBuilderMeta: GalleryComponentMeta = {
  id: "course-builder/curriculum-builder",
  sourceId: "@/platform/components/CourseBuilder/CurriculumBuilder#CurriculumBuilder",
  status: 'prod',
}

export const curriculumBuilderGalleryEntry: GalleryEntry<CurriculumBuilderProps> = {
  name: 'CurriculumBuilder',
  importPath: '@/platform/components/CourseBuilder/CurriculumBuilder',
  category: 'Course Management',
  id: curriculumBuilderMeta.id,
  meta: curriculumBuilderMeta,
  layoutSize: 'large',
  variants: [
    {
      name: 'Complex Drag-and-Drop Component',
      description: 'Curriculum builder with sortable lessons - requires complex state management',
      props: {
        lessons: [],
        onChange: () => console.log('Lessons changed'),
        onEditLesson: () => console.log('Edit lesson'),
        __skipRender: true,
      },
      status: 'prod',
      category: 'layout',
    },
  ],
}
