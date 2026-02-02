import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react"
import { useState } from "react"

import { Autocomplete } from "@thicket/components/ui/autocomplete"
import { Button } from "@thicket/components/ui/button"
import { filterAcademicDegrees } from "@thicket/data/academic-degrees"
import { filterAcademicFields } from "@thicket/data/academic-fields"
import { filterAcademicPositions } from "@thicket/data/academic-positions"
import { filterInstitutions } from "@thicket/data/institutions"
import { arrayMove, useDragSensors } from "@thicket/platform/utils/drag-helpers"

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

interface SortableCredentialItemProps {
  entry: CredentialEntry
  index: number
  isExpanded: boolean
  config: CredentialTableConfig
  onToggleExpanded: (index: number) => void
  onRemove: (index: number) => void
  onEntryChange: (index: number, entry: CredentialEntry) => void
}

function SortableCredentialItem({
  entry,
  index,
  isExpanded,
  config,
  onToggleExpanded,
  onRemove,
  onEntryChange,
}: SortableCredentialItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `item-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-subtle rounded-lg border bg-white transition-shadow hover:shadow-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 p-4 bg-brand-50 rounded-t-lg">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="text-muted hover:text-muted-foreground cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5 shrink-0" />
          </div>
          <button
            type="button"
            onClick={() => onToggleExpanded(index)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm font-medium">
              {config.formatPreview(entry)}
            </span>
            {isExpanded ? (
              <ChevronUp className="text-muted h-5 w-5 shrink-0" />
            ) : (
              <ChevronDown className="text-muted h-5 w-5 shrink-0" />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-muted hover:text-red-600 shrink-0 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {isExpanded && (
        <div className="border-subtle border-t p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr_1fr]">
            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                {config.selectLabel}
              </label>
              <Autocomplete
                value={entry[config.selectField]}
                onChange={(value) =>
                  onEntryChange(index, {
                    ...entry,
                    [config.selectField]: value,
                  })
                }
                suggestions={
                  config.selectField === "degree"
                    ? filterAcademicDegrees(entry[config.selectField])
                    : config.selectField === "position"
                    ? filterAcademicPositions(entry[config.selectField])
                    : []
                }
                placeholder={config.selectPlaceholder || "Select"}
              />
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                {config.fieldLabel || "Field"}
              </label>
              <Autocomplete
                value={entry.field}
                onChange={(value) =>
                  onEntryChange(index, { ...entry, field: value })
                }
                suggestions={filterAcademicFields(entry.field)}
                placeholder={config.fieldPlaceholder || "e.g., Architecture"}
              />
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                {config.institutionLabel || "Institution"}
              </label>
              <Autocomplete
                value={entry.institution}
                onChange={(value) =>
                  onEntryChange(index, {
                    ...entry,
                    institution: value,
                  })
                }
                suggestions={filterInstitutions(entry.institution)}
                placeholder={config.institutionPlaceholder || "e.g., MIT"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CredentialTableInput({
  entries,
  onChange,
  config,
}: CredentialTableInputProps) {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    new Set(entries.map((_, idx) => idx))
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useDragSensors()

  const handleAddRow = () => {
    const newIndex = entries.length
    const newEntry: CredentialEntry = {
      [config.selectField]: "",
      field: "",
      institution: "",
    }
    onChange([...entries, newEntry])
    setExpandedIndices((prev) => new Set([...prev, newIndex]))
  }

  const handleRemoveRow = (index: number) => {
    onChange(entries.filter((_, i) => i !== index))
    setExpandedIndices((prev) => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
  }

  const handleEntryChange = (index: number, entry: CredentialEntry) => {
    const newEntries = [...entries]
    newEntries[index] = entry
    onChange(newEntries)
  }

  const toggleExpanded = (index: number) => {
    setExpandedIndices((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    const oldIndex = entries.findIndex((_, index) => `item-${index}` === active.id)
    const newIndex = entries.findIndex((_, index) => `item-${index}` === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(entries, oldIndex, newIndex)
      onChange(reordered)
    }

    setActiveId(null)
  }

  const activeIndex = activeId
    ? entries.findIndex((_, index) => `item-${index}` === activeId)
    : -1

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <div className="flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleAddRow}
          >
            <Plus className="mr-2 h-4 w-4" />
            {config.emptyButtonText}
          </Button>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={entries.map((_, index) => `item-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <SortableCredentialItem
                    key={`item-${index}`}
                    entry={entry}
                    index={index}
                    isExpanded={expandedIndices.has(index)}
                    config={config}
                    onToggleExpanded={toggleExpanded}
                    onRemove={handleRemoveRow}
                    onEntryChange={handleEntryChange}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeId && activeIndex !== -1 ? (
                <div className="border-subtle rounded-lg border bg-white shadow-lg">
                  <div className="flex items-start justify-between gap-3 p-4 bg-brand-50 rounded-lg">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <GripVertical className="text-muted h-5 w-5 shrink-0" />
                      <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm font-medium">
                        {config.formatPreview(entries[activeIndex])}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {config.addButtonText}
          </Button>

          {entries.length > 0 && (
            <p className="text-muted text-xs">
              {entries.length}{" "}
              {entries.length === 1 ? config.entryNoun : config.entryNounPlural} added
            </p>
          )}
        </>
      )}
    </div>
  )
}
