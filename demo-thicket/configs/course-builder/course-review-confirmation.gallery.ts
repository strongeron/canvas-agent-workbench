import type { CourseReviewConfirmation } from "@thicket/platform/CourseBuilder/CourseReviewConfirmation"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"

type CourseReviewConfirmationProps = React.ComponentProps<typeof CourseReviewConfirmation>

const courseReviewConfirmationMeta: GalleryComponentMeta = {
  id: "course-builder/course-review-confirmation",
  sourceId: "@thicket/platform/CourseBuilder/CourseReviewConfirmation#CourseReviewConfirmation",
  status: 'prod',
}

export const courseReviewConfirmationGalleryEntry: GalleryEntry<CourseReviewConfirmationProps> = {
  name: 'CourseReviewConfirmation',
  importPath: '@thicket/platform/CourseBuilder/CourseReviewConfirmation',
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
