import { LearningObjectivesList } from "@/components/learning-objectives-list"
import type { GalleryComponentMeta } from "../registry/types"
import type { GalleryEntry } from "../registry/types"

const objectives = [
  "Analyze primary sources with a critical lens",
  "Connect historical movements to modern contexts",
  "Develop compelling research questions",
  "Present arguments with clarity and evidence",
]

export const learningObjectivesListMeta: GalleryComponentMeta = {
  id: "landing.learning-objectives-list",
  sourceId: "@/components/learning-objectives-list#LearningObjectivesList",
  status: "prod",
}

export const learningObjectivesListGalleryEntry: GalleryEntry<{ objectives: string[] }> = {
  name: "LearningObjectivesList",
  importPath: learningObjectivesListMeta.sourceId.split("#")[0],
  category: "Landing",
  id: learningObjectivesListMeta.id,
  layoutSize: "medium",
  meta: learningObjectivesListMeta,
  variants: [
    {
      name: "Default",
      description: "Checklist of learning objectives",
      props: { objectives },
      status: "prod",
      category: "Default",
    },
  ],
}
