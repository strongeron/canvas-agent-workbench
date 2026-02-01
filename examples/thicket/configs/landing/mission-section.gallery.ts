import { MissionSection } from "@/components/mission-section"
import type { GalleryComponentMeta } from "../registry/types"
import type { GalleryEntry } from "../registry/types"

export const missionSectionMeta: GalleryComponentMeta = {
  id: "landing.mission-section",
  sourceId: "@/components/mission-section#MissionSection",
  status: "prod",
}

export const missionSectionGalleryEntry: GalleryEntry<Record<string, never>> = {
  name: "Mission Section",
  importPath: missionSectionMeta.sourceId.split("#")[0],
  category: "Landing",
  id: missionSectionMeta.id,
  layoutSize: "full",
  meta: missionSectionMeta,
  variants: [
    {
      name: "Default",
      description: "Mission story with imagery for the marketing page.",
      status: 'prod',
      category: "Default",
      props: {},
    },
  ],
}
