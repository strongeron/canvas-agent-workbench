import { X } from "lucide-react"

import { Autocomplete } from "../components/ui/autocomplete"
import { Button } from "../components/ui/button"
import { Select } from "../components/ui/select"
import { filterAcademicFields } from "../data/academic-fields"
import { filterInstitutions } from "../data/institutions"
import type { TeachingExperienceEntry } from "../data/instructors"

const POSITION_OPTIONS: TeachingExperienceEntry["position"][] = [
  "Teaching Assistant",
  "Adjunct",
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
]

interface TeachingExperienceEntryInputProps {
  entry: TeachingExperienceEntry
  onChange: (entry: TeachingExperienceEntry) => void
  onRemove: () => void
  showRemove?: boolean
}

export function TeachingExperienceEntryInput({
  entry,
  onChange,
  onRemove,
  showRemove = true,
}: TeachingExperienceEntryInputProps) {
  const fieldSuggestions = filterAcademicFields(entry.field)
  const institutionSuggestions = filterInstitutions(entry.institution)

  return (
    <div className="border-subtle rounded-lg border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-foreground text-sm font-medium">
          Teaching Experience Entry
        </h4>
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
          label="Position"
          value={entry.position}
          onChange={(value) =>
            onChange({
              ...entry,
              position: value as TeachingExperienceEntry["position"],
            })
          }
          placeholder="Select position"
          className="text-sm"
        >
          <option value="">Select position</option>
          {POSITION_OPTIONS.map((position) => (
            <option key={position} value={position}>
              {position}
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
