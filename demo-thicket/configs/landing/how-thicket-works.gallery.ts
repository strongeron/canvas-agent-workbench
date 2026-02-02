import { HowThicketWorks } from "../../components/how-thicket-works"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

export const howThicketWorksMeta: GalleryComponentMeta = {
  id: "landing.how-thicket-works",
  sourceId: "../../components/how-thicket-works#HowThicketWorks",
  status: "prod",
}

export const howThicketWorksGalleryEntry: GalleryEntry<Record<string, never>> = {
  name: "How Thicket Works",
  importPath: howThicketWorksMeta.sourceId.split("#")[0],
  category: "Landing",
  id: howThicketWorksMeta.id,
  layoutSize: "full",
  meta: howThicketWorksMeta,
  variants: [
    {
      name: "Default",
      description: "Three-step explainer for the Thicket platform.",
      status: 'prod',
      category: "Default",
      props: {},
    },
  ],
}
