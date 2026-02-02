import { X } from "lucide-react"

import { Autocomplete } from "@thicket/components/ui/autocomplete"
import { Button } from "@thicket/components/ui/button"
import { Select } from "@thicket/components/ui/select"
import { filterAcademicFields } from "@thicket/data/academic-fields"
import { filterInstitutions } from "@thicket/data/institutions"
import type { EducationEntry } from "@thicket/data/instructors"

const DEGREE_OPTIONS: EducationEntry["degree"][] = [
  "Certification",
  "BA",
  "BS",
  "MA",
  "MS",
  "MFA",
  "MPhil",
  "PhD",
]

interface EducationEntryInputProps {
  entry: EducationEntry
  onChange: (entry: EducationEntry) => void
  onRemove: () => void
  showRemove?: boolean
}

export function EducationEntryInput({
  entry,
  onChange,
  onRemove,
  showRemove = true,
}: EducationEntryInputProps) {
  const fieldSuggestions = filterAcademicFields(entry.field)
  const institutionSuggestions = filterInstitutions(entry.institution)

  return (
    <div className="border-subtle rounded-lg border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-foreground text-sm font-medium">Education Entry</h4>
        {showRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-muted hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <Select
          label="Degree"
          value={entry.degree}
          onChange={(value) =>
            onChange({
              ...entry,
              degree: value as EducationEntry["degree"],
            })
          }
          placeholder="Select degree"
          className="text-sm"
        >
          <option value="">Select degree</option>
          {DEGREE_OPTIONS.map((degree) => (
            <option key={degree} value={degree}>
              {degree}
            </option>
          ))}
        </Select>

        <div>
          <label className="text-foreground mb-2 block text-sm font-medium">
            Field <span className="text-red-500">*</span>
          </label>
          <Autocomplete
            value={entry.field}
            onChange={(value) => onChange({ ...entry, field: value })}
            suggestions={fieldSuggestions}
            placeholder="e.g., Architecture, History, Computer Science"
          />
        </div>

        <div>
          <label className="text-foreground mb-2 block text-sm font-medium">
            Institution <span className="text-red-500">*</span>
          </label>
          <Autocomplete
            value={entry.institution}
            onChange={(value) => onChange({ ...entry, institution: value })}
            suggestions={institutionSuggestions}
            placeholder="e.g., Harvard University, MIT"
          />
        </div>
      </div>
    </div>
  )
}
