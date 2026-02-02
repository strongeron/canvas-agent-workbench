import { LessonEditor } from "../../platform/CourseBuilder/LessonEditor"

export { LessonEditor }
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { GalleryComponentMeta } from "../../platform/gallery/types"

type LessonEditorProps = React.ComponentProps<typeof LessonEditor>

const lessonEditorMeta: GalleryComponentMeta = {
  id: "course-builder/lesson-editor",
  sourceId: "../../platform/CourseBuilder/LessonEditor#LessonEditor",
  status: 'prod',
}

export const lessonEditorGalleryEntry: GalleryEntry<LessonEditorProps> = {
  name: 'LessonEditor',
  importPath: '../../platform/CourseBuilder/LessonEditor',
  category: 'Course Management',
  id: lessonEditorMeta.id,
  meta: lessonEditorMeta,
  layoutSize: 'large',
  variants: [
    {
      name: 'Complex Modal Editor',
      description: 'Full lesson editor modal with title, description, and assignments - requires modal state',
      props: {
        __skipRender: true,
      },
      status: 'prod',
      category: 'layout',
    },
  ],
}
