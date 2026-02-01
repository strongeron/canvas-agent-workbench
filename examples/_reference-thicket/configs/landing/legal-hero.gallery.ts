import { LegalHero } from "@/components/legal-hero"
import type { GalleryComponentMeta } from "../registry/types"
import type { GalleryEntry } from "../registry/types"

export const legalHeroMeta: GalleryComponentMeta = {
  id: "landing.legal-hero",
  sourceId: "@/components/legal-hero#LegalHero",
  status: "prod",
}

export const legalHeroGalleryEntry: GalleryEntry<{ title: string; lastUpdated?: string }> = {
  name: "LegalHero",
  importPath: legalHeroMeta.sourceId.split("#")[0],
  category: "Landing",
  id: legalHeroMeta.id,
  layoutSize: "full",
  meta: legalHeroMeta,
  variants: [
    {
      name: "With Last Updated",
      description: "Legal hero with timestamp",
      props: { title: "Terms of Service", lastUpdated: "Last updated June 1, 2024" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Title Only",
      description: "Simplified legal hero without date",
      props: { title: "Privacy Policy" },
      status: "archive",
      category: "variant",
    },
  ],
}
