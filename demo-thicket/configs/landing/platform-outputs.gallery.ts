import { PlatformOutputs } from "@thicket/components/platform-outputs"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

export const platformOutputsMeta: GalleryComponentMeta = {
  id: "landing.platform-outputs",
  sourceId: "@thicket/components/platform-outputs#PlatformOutputs",
  status: "prod",
}

export const platformOutputsGalleryEntry: GalleryEntry<{ variant?: "full" | "minimal" | "details" | "cards-only" | "minimalistic-b"; showCta?: boolean }> = {
  name: "PlatformOutputs",
  importPath: platformOutputsMeta.sourceId.split("#")[0],
  category: "Landing",
  id: platformOutputsMeta.id,
  layoutSize: "full",
  meta: platformOutputsMeta,
  variants: [
    {
      name: "Full",
      description: "Feature grid with CTA hidden",
      props: { variant: "full", showCta: false },
      status: "archive",
      category: "variant",
    },
    {
      name: "Cards Only",
      description: "Compact card layout",
      props: { variant: "cards-only" },
      status: "prod",
      category: "variant",
    },
  ],
}
