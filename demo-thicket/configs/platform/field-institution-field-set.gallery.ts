import { FieldInstitutionFieldSet } from "../../platform/FieldInstitutionFieldSet"
import type { GalleryComponentMeta } from "../../platform/gallery/types"
import type { GalleryEntry } from "../../platform/gallery/registry/types"

export const fieldInstitutionFieldSetMeta: GalleryComponentMeta = {
  id: "platform/field-institution-field-set",
  sourceId: "../../platform/FieldInstitutionFieldSet#FieldInstitutionFieldSet",
  status: "prod",
}

export const fieldInstitutionFieldSetGalleryEntry: GalleryEntry<{
  fieldValue: string
  onFieldChange: (value: string) => void
  institutionValue: string
  onInstitutionChange: (value: string) => void
  required?: boolean
}> = {
  name: "FieldInstitutionFieldSet",
  importPath: fieldInstitutionFieldSetMeta.sourceId.split("#")[0],
  category: "Profile & Forms",
  id: fieldInstitutionFieldSetMeta.id,
  layoutSize: "medium",
  meta: fieldInstitutionFieldSetMeta,
  variants: [
    {
      name: "Default",
      description: "Field + institution autocomplete pair",
      props: {
        fieldValue: "Architecture",
        onFieldChange: () => {},
        institutionValue: "MIT",
        onInstitutionChange: () => {},
        required: true,
      },
      status: "prod",
      category: "Default",
    },
  ],
}
