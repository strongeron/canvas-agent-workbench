import { AboutHero } from "../../components/about-hero"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

export const aboutHeroMeta: GalleryComponentMeta = {
  id: "landing.about-hero",
  sourceId: "../../components/about-hero#AboutHero",
  status: "prod",
}

export const aboutHeroGalleryEntry: GalleryEntry<Record<string, never>> = {
  name: "AboutHero",
  importPath: aboutHeroMeta.sourceId.split("#")[0],
  category: "Landing",
  id: aboutHeroMeta.id,
  layoutSize: "full",
  meta: aboutHeroMeta,
  variants: [
    {
      name: "Default",
      description: "Marketing hero with gradient background",
      props: {},
      status: "prod",
      category: "Default",
    },
  ],
}
