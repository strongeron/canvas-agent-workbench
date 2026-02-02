import type { CurriculumBuilder } from "@thicket/platform/CourseBuilder/CurriculumBuilder"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"

type CurriculumBuilderProps = React.ComponentProps<typeof CurriculumBuilder>

const curriculumBuilderMeta: GalleryComponentMeta = {
  id: "course-builder/curriculum-builder",
  sourceId: "@thicket/platform/CourseBuilder/CurriculumBuilder#CurriculumBuilder",
  status: 'prod',
}

export const curriculumBuilderGalleryEntry: GalleryEntry<CurriculumBuilderProps> = {
  name: 'CurriculumBuilder',
  importPath: '@thicket/platform/CourseBuilder/CurriculumBuilder',
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
