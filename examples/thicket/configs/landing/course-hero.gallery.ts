import { CourseHero } from "@/components/course-hero"
import type { GalleryComponentMeta } from "../registry/types"
import type { GalleryEntry } from "../registry/types"

const sampleCourseHeroProps = {
  title: "Ancient Civilizations: A Deep Dive",
  description:
    "Explore the rise and fall of ancient empires, their cultural achievements, and lasting influence on the modern world.",
  imageUrl: "https://images.pexels.com/photos/161931/italy-ancient-antique-architecture-161931.jpeg",
  durationWeeks: 6,
  startsAt: "2024-09-15T17:00:00Z",
  lessonLength: 2,
}

export const courseHeroMeta: GalleryComponentMeta = {
  id: "landing.course-hero",
  sourceId: "@/components/course-hero#CourseHero",
  status: "prod",
}

export const courseHeroGalleryEntry: GalleryEntry<typeof sampleCourseHeroProps> = {
  name: "CourseHero",
  importPath: courseHeroMeta.sourceId.split("#")[0],
  category: "Landing",
  id: courseHeroMeta.id,
  layoutSize: "full",
  meta: courseHeroMeta,
  variants: [
    {
      name: "With Start Date",
      description: "Hero with course meta and start date",
      props: sampleCourseHeroProps,
      status: "prod",
      category: "variant",
    },
    {
      name: "Without Start Date",
      description: "Hero when start date is not set",
      props: { ...sampleCourseHeroProps, startsAt: null },
      status: "archive",
      category: "variant",
    },
  ],
}
