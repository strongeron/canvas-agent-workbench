import { PlatformOutputs } from "@/components/platform-outputs"
import type { GalleryComponentMeta } from "../registry/types"
import type { GalleryEntry } from "../registry/types"

export const platformOutputsMeta: GalleryComponentMeta = {
  id: "landing.platform-outputs",
  sourceId: "@/components/platform-outputs#PlatformOutputs",
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
