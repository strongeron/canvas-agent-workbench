import type { EducationEntry } from "../../data/instructors"
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { GalleryComponentMeta } from '../../platform/gallery/types'

interface EducationEntryInputProps {
  entry: EducationEntry
  onChange: (entry: EducationEntry) => void
  onRemove: () => void
  showRemove?: boolean
}

const educationEntryInputMeta: GalleryComponentMeta = {
    id: 'platform/education-entry-input',
  sourceId: '../../platform/EducationEntryInput#EducationEntryInput',
  status: 'archive',
}

export const educationEntryInputGalleryEntry: GalleryEntry<EducationEntryInputProps> = {
  name: 'EducationEntryInput',
  importPath: educationEntryInputMeta.sourceId.split('#')[0],
  category: 'Platform',
  id: 'platform/education-entry-input',
  layoutSize: 'full',
  variants: [
    {
      name: 'Filled Entry',
      description: 'Education entry with complete information',
      props: {
        entry: {
          degree: "PhD",
          field: "Computer Science",
          institution: "Stanford University",
          year: 2018,
        },
        onChange: () => {},
        onRemove: () => {},
        showRemove: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Empty Entry',
      description: 'Empty education entry form',
      props: {
        entry: {
          degree: "",
          field: "",
          institution: "",
          year: undefined,
        },
        onChange: () => {},
        onRemove: () => {},
        showRemove: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Without Remove Button',
      description: 'Entry without remove option',
      props: {
        entry: {
          degree: "BS",
          field: "Software Engineering",
          institution: "MIT",
          year: 2015,
        },
        onChange: () => {},
        onRemove: () => {},
        showRemove: false,
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
