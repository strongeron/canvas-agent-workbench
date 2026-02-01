import { TeacherHero } from "@/components/teacher-hero"
import type { GalleryComponentMeta } from "../registry/types"
import type { GalleryEntry } from "../registry/types"

export const teacherHeroMeta: GalleryComponentMeta = {
  id: "landing.teacher-hero",
  sourceId: "@/components/teacher-hero#TeacherHero",
  status: "prod",
}

export const teacherHeroGalleryEntry: GalleryEntry<Record<string, never>> = {
  name: "Teacher Hero",
  importPath: teacherHeroMeta.sourceId.split("#")[0],
  category: "Landing",
  id: teacherHeroMeta.id,
  layoutSize: "large",
  meta: teacherHeroMeta,
  variants: [
    {
      name: "Default",
      description: "Hero section for teachers applying to teach.",
      status: 'prod',
      category: "Default",
      props: {},
    },
  ],
}
