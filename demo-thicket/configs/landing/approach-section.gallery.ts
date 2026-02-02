import { ApproachSection } from "../../components/approach-section"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

type ApproachSectionProps = { variant?: "image" | "video" }

export const approachSectionMeta: GalleryComponentMeta = {
  id: "landing.approach-section",
  sourceId: "../../components/approach-section#ApproachSection",
  status: "prod",
}

export const approachSectionGalleryEntry: GalleryEntry<ApproachSectionProps> = {
  name: "ApproachSection",
  importPath: approachSectionMeta.sourceId.split("#")[0],
  category: "Landing",
  id: approachSectionMeta.id,
  layoutSize: "full",
  meta: approachSectionMeta,
  variants: [
    {
      name: "Image",
      description: "Static imagery variant",
      props: { variant: "image" },
      status: "archive",
      category: "variant",
    },
    {
      name: "Video",
      description: "Autoplaying video variant",
      props: { variant: "video" },
      status: "prod",
      category: "variant",
    },
  ],
}
