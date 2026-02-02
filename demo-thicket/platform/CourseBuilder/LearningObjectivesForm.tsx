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
import { GripVertical, Plus, Target, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "../../components/ui/button"
import { Textarea } from "../../components/ui/textarea"
import { arrayMove, useDragSensors } from "../utils/drag-helpers"

interface LearningObjectivesFormProps {
  objectives: string[]
  onChange: (objectives: string[]) => void
}

interface SortableObjectiveProps {
  objective: string
  index: number
  isEditing: boolean
  editValue: string
  onStartEdit: (index: number) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditValueChange: (value: string) => void
  onRemove: (index: number) => void
}

function SortableObjective({
  objective,
  index,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onRemove,
}: SortableObjectiveProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `objective-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-3 rounded-lg border border-default bg-white p-4 transition-all hover:border-strong hover:shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex cursor-grab flex-col gap-1 pt-1 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="text-muted hover:text-foreground h-4 w-4 transition-colors" />
      </div>

      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              label="Edit Objective"
              hideLabel
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="brand" size="sm" onClick={onSaveEdit}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onStartEdit(index)}
            className="text-foreground cursor-pointer text-sm leading-relaxed"
          >
            {objective}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isEditing && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-error hover:bg-error/10 rounded p-1.5 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export function LearningObjectivesForm({
  objectives,
  onChange,
}: LearningObjectivesFormProps) {
  const [newObjective, setNewObjective] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useDragSensors()

  const handleAdd = () => {
    if (newObjective.trim()) {
      onChange([...objectives, newObjective.trim()])
      setNewObjective("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRemove = (index: number) => {
    onChange(objectives.filter((_, i) => i !== index))
  }

  const handleStartEdit = (index: number) => {
    setEditingIndex(index)
    setEditValue(objectives[index])
  }

  const handleSaveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const updated = [...objectives]
      updated[editingIndex] = editValue.trim()
      onChange(updated)
      setEditingIndex(null)
      setEditValue("")
    }
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditValue("")
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = objectives.findIndex(
      (_, index) => `objective-${index}` === active.id
    )
    const newIndex = objectives.findIndex(
      (_, index) => `objective-${index}` === over.id
    )

    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(arrayMove(objectives, oldIndex, newIndex))
    }
  }

  const activeObjective = activeId
    ? objectives[
        objectives.findIndex(
          (_, index) => `objective-${index}` === activeId
        )
      ]
    : null

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Target className="text-brand-600 h-6 w-6" />
          <h2 className="font-display text-foreground text-xl font-bold">
            What you&apos;ll learn
          </h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Add clear learning outcomes for your students. Drag to reorder.
        </p>

        {objectives.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={objectives.map((_, index) => `objective-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mb-4 space-y-3">
                {objectives.map((objective, index) => (
                  <SortableObjective
                    key={`objective-${index}`}
                    objective={objective}
                    index={index}
                    isEditing={editingIndex === index}
                    editValue={editValue}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeObjective ? (
                <div className="flex items-start gap-3 rounded-lg border border-strong bg-white p-4 shadow-lg">
                  <GripVertical className="text-muted h-4 w-4" />
                  <div className="text-foreground flex-1 text-sm leading-relaxed">
                    {activeObjective}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}


        <div className="space-y-3">
          <Textarea
            label="Add Learning Outcome"
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Example: Master the principles of Renaissance architectural design and theory"
            rows={3}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!newObjective.trim()}
            icon={Plus}
          >
            Add Outcome
          </Button>
        </div>
      </div>
    </div>
  )
}
