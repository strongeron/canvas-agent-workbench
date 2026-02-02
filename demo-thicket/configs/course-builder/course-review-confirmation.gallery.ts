import type { CourseReviewConfirmation } from "../../platform/CourseBuilder/CourseReviewConfirmation"
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { GalleryComponentMeta } from "../../platform/gallery/types"

type CourseReviewConfirmationProps = React.ComponentProps<typeof CourseReviewConfirmation>

const courseReviewConfirmationMeta: GalleryComponentMeta = {
  id: "course-builder/course-review-confirmation",
  sourceId: "../../platform/CourseBuilder/CourseReviewConfirmation#CourseReviewConfirmation",
  status: 'prod',
}

export const courseReviewConfirmationGalleryEntry: GalleryEntry<CourseReviewConfirmationProps> = {
  name: 'CourseReviewConfirmation',
  importPath: '../../platform/CourseBuilder/CourseReviewConfirmation',
  category: 'Course Management',
  id: courseReviewConfirmationMeta.id,
  meta: courseReviewConfirmationMeta,
  layoutSize: 'large',
  variants: [
    {
      name: 'Review Summary Component',
      description: 'Course review/confirmation step - requires complex children structure',
      props: {
        __skipRender: true,
      },
      status: 'prod',
      category: 'layout',
    },
  ],
}
