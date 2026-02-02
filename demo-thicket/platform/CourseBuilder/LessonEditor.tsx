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
import { GripVertical, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Modal } from "../../components/ui/modal"
import { AssignmentUploadZone } from "./AssignmentUploadZone"
import { arrayMove, useDragSensors } from "../utils/drag-helpers"
import type { Lesson } from "../../types"

interface LessonEditorProps {
  lesson: Lesson | null
  lessonIndex: number
  isOpen: boolean
  onClose: () => void
  onSave: (lesson: Lesson, index: number) => void
}

interface SortableTopicProps {
  topic: string
  index: number
  onRemove: (index: number) => void
}

function SortableTopic({ topic, index, onRemove }: SortableTopicProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `topic-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-default bg-white p-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="text-muted hover:text-foreground h-4 w-4 transition-colors" />
      </div>
      <p className="text-foreground flex-1 text-sm">{topic}</p>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-error hover:bg-error/10 rounded p-1 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function LessonEditor({
  lesson,
  lessonIndex,
  isOpen,
  onClose,
  onSave,
}: LessonEditorProps) {
  const [formData, setFormData] = useState<Lesson>({
    id: 0,
    position: 1,
    title: "",
    description: "",
    topics: [],
    assignments: [],
  })
  const [newTopic, setNewTopic] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useDragSensors()

  useEffect(() => {
    if (lesson) {
      // Sync incoming lesson props into the editable form once the modal opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        ...lesson,
        assignments: lesson.assignments || [],
      })
    }
  }, [lesson])

  const handleSave = () => {
    if (formData.title.trim()) {
      onSave(formData, lessonIndex)
      onClose()
    }
  }

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setFormData({
        ...formData,
        topics: [...formData.topics, newTopic.trim()],
      })
      setNewTopic("")
    }
  }

  const handleRemoveTopic = (index: number) => {
    setFormData({
      ...formData,
      topics: formData.topics.filter((_, i) => i !== index),
    })
  }

  const handleTopicKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTopic()
    }
  }

  const handleTopicBlur = () => {
    handleAddTopic()
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

    const oldIndex = formData.topics.findIndex(
      (_, index) => `topic-${index}` === active.id
    )
    const newIndex = formData.topics.findIndex(
      (_, index) => `topic-${index}` === over.id
    )

    if (oldIndex !== -1 && newIndex !== -1) {
      setFormData({
        ...formData,
        topics: arrayMove(formData.topics, oldIndex, newIndex),
      })
    }
  }

  const activeTopic = activeId
    ? formData.topics[
        formData.topics.findIndex((_, index) => `topic-${index}` === activeId)
      ]
    : null

  if (!lesson) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      aria-labelledby="lesson-editor-title"
      aria-describedby="lesson-editor-description"
    >
      <Modal.Header
        title={formData.title || "Edit Lesson"}
        onClose={onClose}
      />
      <Modal.Body id="lesson-editor-description">
        <div className="space-y-6">
          <Input
            label="Lesson Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Introduction to Renaissance Architecture"
            required
          />

          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              Topics Covered
            </label>
            <p className="text-muted mb-3 text-xs">
              List the specific topics or concepts covered in this lesson. Drag to reorder.
            </p>

            {formData.topics.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={formData.topics.map((_, index) => `topic-${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="mb-3 space-y-2">
                    {formData.topics.map((topic, index) => (
                      <SortableTopic
                        key={`topic-${index}`}
                        topic={topic}
                        index={index}
                        onRemove={handleRemoveTopic}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeTopic ? (
                    <div className="flex items-center gap-3 rounded-lg border border-strong bg-white p-3 shadow-lg">
                      <GripVertical className="text-muted h-4 w-4" />
                      <p className="text-foreground flex-1 text-sm">{activeTopic}</p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            <div className="flex gap-3">
              <div className="w-1/2">
                <Input
                  label="Add Topic"
                  hideLabel
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={handleTopicKeyDown}
                  onBlur={handleTopicBlur}
                  placeholder="Add a topic"
                />
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={handleAddTopic}
                disabled={!newTopic.trim()}
                icon={Plus}
                fullWidth={false}
                rounded="lg"
                className="px-8"
              >
                Add
              </Button>
            </div>
          </div>

          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              Assignments & Resources
            </label>
            <p className="text-muted mb-3 text-xs">
              This can be added later and will only be visible to enrolled students.
            </p>
            <AssignmentUploadZone
              assignments={formData.assignments || []}
              onAssignmentsChange={(assignments) =>
                setFormData({ ...formData, assignments })
              }
              lessonId={formData.id}
            />
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        <Button variant="ghost" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="brand"
          size="md"
          onClick={handleSave}
          disabled={!formData.title.trim()}
        >
          Save Lesson
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
