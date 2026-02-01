import type { TeachingExperienceEntry } from "@/data/instructors"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

interface TeachingExperienceEntryInputProps {
  entry: TeachingExperienceEntry
  onChange: (entry: TeachingExperienceEntry) => void
  onRemove: () => void
  showRemove?: boolean
}

const teachingExperienceEntryInputMeta: GalleryComponentMeta = {
    id: 'platform/teaching-experience-entry-input',
  sourceId: '@/platform/components/TeachingExperienceEntryInput#TeachingExperienceEntryInput',
  status: 'archive',
}

export const teachingExperienceEntryInputGalleryEntry: GalleryEntry<TeachingExperienceEntryInputProps> = {
  name: 'TeachingExperienceEntryInput',
  importPath: teachingExperienceEntryInputMeta.sourceId.split('#')[0],
  category: 'Platform',
  id: 'platform/teaching-experience-entry-input',
  layoutSize: 'full',
  variants: [
    {
      name: 'Filled Entry',
      description: 'Teaching experience with complete information',
      props: {
        entry: {
          institution: "Stanford University",
          role: "Associate Professor",
          subject: "Computer Science",
          startYear: 2015,
          endYear: 2023,
          current: false,
        },
        onChange: () => {},
        onRemove: () => {},
        showRemove: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Current Position',
      description: 'Currently active teaching position',
      props: {
        entry: {
          institution: "MIT",
          role: "Professor",
          subject: "Software Engineering",
          startYear: 2020,
          endYear: undefined,
          current: true,
        },
        onChange: () => {},
        onRemove: () => {},
        showRemove: true,
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
