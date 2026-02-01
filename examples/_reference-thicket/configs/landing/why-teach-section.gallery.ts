import { WhyTeachSection } from "@/components/why-teach-section"
import type { GalleryComponentMeta } from "../registry/types"
import type { GalleryEntry } from "../registry/types"

export const whyTeachSectionMeta: GalleryComponentMeta = {
  id: "landing.why-teach-section",
  sourceId: "@/components/why-teach-section#WhyTeachSection",
  status: "prod",
}

export const whyTeachSectionGalleryEntry: GalleryEntry<Record<string, never>> = {
  name: "WhyTeachSection",
  importPath: whyTeachSectionMeta.sourceId.split("#")[0],
  category: "Landing",
  id: whyTeachSectionMeta.id,
  layoutSize: "full",
  meta: whyTeachSectionMeta,
  variants: [
    {
      name: "Default",
      description: "Reasons to teach with CTA",
      props: {},
      status: "prod",
      category: "Default",
    },
  ],
}
