import { TeacherFAQSection } from "@thicket/components/teacher-faq-section"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export const teacherFaqSectionMeta: GalleryComponentMeta = {
  id: "landing.teacher-faq-section",
  sourceId: "@thicket/components/teacher-faq-section#TeacherFAQSection",
  status: "prod",
}

export const teacherFaqSectionGalleryEntry: GalleryEntry<Record<string, never>> = {
  name: "TeacherFAQSection",
  importPath: teacherFaqSectionMeta.sourceId.split("#")[0],
  category: "Landing",
  id: teacherFaqSectionMeta.id,
  layoutSize: "full",
  meta: teacherFaqSectionMeta,
  variants: [
    {
      name: "Default",
      description: "FAQ accordion for teachers",
      props: {},
      status: "prod",
      category: "Default",
    },
  ],
}
