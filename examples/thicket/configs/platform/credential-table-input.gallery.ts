import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"

type CredentialEntry = Record<string, string>;

interface CredentialTableConfig {
  selectField: string
  selectLabel: string
  selectOptions: string[]
  selectPlaceholder?: string
  fieldLabel?: string
  institutionLabel?: string
  fieldPlaceholder?: string
  institutionPlaceholder?: string
  formatPreview: (entry: CredentialEntry) => string
  addButtonText: string
  emptyButtonText: string
  entryNoun: string
  entryNounPlural: string
}

interface CredentialTableInputProps {
  entries: CredentialEntry[]
  onChange: (entries: CredentialEntry[]) => void
  config: CredentialTableConfig
}

export const credentialTableInputMeta: GalleryComponentMeta = {
  id: 'platform/credential-table-input',
  sourceId: '@/platform/components/CredentialTableInput#CredentialTableInput',
  status: 'prod',
}

const educationConfig: CredentialTableConfig = {
  selectField: "degree",
  selectLabel: "Degree",
  selectOptions: ["Certification", "BA", "BS", "MA", "MS", "MFA", "MPhil", "PhD"],
  selectPlaceholder: "Select",
  fieldPlaceholder: "e.g., Architecture",
  institutionPlaceholder: "e.g., MIT",
  formatPreview: (entry) => {
    if (entry.degree && entry.field && entry.institution) {
      return `${entry.degree} in ${entry.field} - ${entry.institution}`
    }
    return "Incomplete entry"
  },
  addButtonText: "Add Another Degree",
  emptyButtonText: "Add Degree",
  entryNoun: "degree",
  entryNounPlural: "degrees",
}

const teachingConfig: CredentialTableConfig = {
  selectField: "position",
  selectLabel: "Position",
  selectOptions: [
    "Teaching Assistant",
    "Graduate Student Instructor",
    "Adjunct",
    "Lecturer",
    "Assistant Professor",
    "Associate Professor",
    "Professor",
  ],
  selectPlaceholder: "Select",
  fieldPlaceholder: "e.g., History",
  institutionPlaceholder: "e.g., Columbia University",
  formatPreview: (entry) => {
    if (entry.position && entry.field && entry.institution) {
      return `${entry.position} of ${entry.field} - ${entry.institution}`
    }
    return "Incomplete entry"
  },
  addButtonText: "Add Another Position",
  emptyButtonText: "Add Position",
  entryNoun: "position",
  entryNounPlural: "positions",
}

export const credentialTableInputGalleryEntry: GalleryEntry<CredentialTableInputProps> = {
  name: 'CredentialTableInput',
  importPath: credentialTableInputMeta.sourceId.split('#')[0],
  category: 'Platform',
  id: credentialTableInputMeta.id,
  layoutSize: 'large',
  meta: credentialTableInputMeta,
  variants: [
    {
      name: 'Education - Multiple Entries',
      description: 'Table with multiple education entries',
      props: {
        entries: [
          {
            degree: "PhD",
            field: "Computer Science",
            institution: "Stanford University",
          },
          {
            degree: "MS",
            field: "Computer Science",
            institution: "MIT",
          },
        ],
        onChange: () => {},
        config: educationConfig,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Education - Empty State',
      description: 'Empty education table',
      props: {
        entries: [],
        onChange: () => {},
        config: educationConfig,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Teaching Experience - Multiple Entries',
      description: 'Table with multiple teaching experience entries',
      props: {
        entries: [
          {
            position: "Assistant Professor",
            field: "History",
            institution: "Columbia University",
          },
          {
            position: "Lecturer",
            field: "Political Science",
            institution: "Yale University",
          },
        ],
        onChange: () => {},
        config: teachingConfig,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Teaching Experience - Empty State',
      description: 'Empty teaching experience table',
      props: {
        entries: [],
        onChange: () => {},
        config: teachingConfig,
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
