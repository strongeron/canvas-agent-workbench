import { Autocomplete } from "@thicket/components/ui/autocomplete"
import { filterAcademicFields } from "@thicket/data/academic-fields"
import { filterInstitutions } from "@thicket/data/institutions"

interface FieldInstitutionFieldSetProps {
  fieldValue: string
  onFieldChange: (value: string) => void
  institutionValue: string
  onInstitutionChange: (value: string) => void
  fieldLabel?: string
  institutionLabel?: string
  fieldPlaceholder?: string
  institutionPlaceholder?: string
  required?: boolean
}

export function FieldInstitutionFieldSet({
  fieldValue,
  onFieldChange,
  institutionValue,
  onInstitutionChange,
  fieldLabel = "Field",
  institutionLabel = "Institution",
  fieldPlaceholder = "e.g., Architecture",
  institutionPlaceholder = "e.g., MIT",
  required = false,
}: FieldInstitutionFieldSetProps) {
  return (
    <>
      <div>
        <label className="text-foreground mb-1.5 block text-xs font-medium">
          {fieldLabel} {required && <span className="text-red-500">*</span>}
        </label>
        <Autocomplete
          value={fieldValue}
          onChange={onFieldChange}
          suggestions={filterAcademicFields(fieldValue)}
          placeholder={fieldPlaceholder}
        />
      </div>
      <div>
        <label className="text-foreground mb-1.5 block text-xs font-medium">
          {institutionLabel} {required && <span className="text-red-500">*</span>}
        </label>
        <Autocomplete
          value={institutionValue}
          onChange={onInstitutionChange}
          suggestions={filterInstitutions(institutionValue)}
          placeholder={institutionPlaceholder}
        />
      </div>
    </>
  )
}
