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
import { BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronUp, Copy, Edit, FileText, Grid3x3, GripVertical, Minus, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@thicket/components/ui/button"
import { arrayMove, useDragSensors } from "@thicket/platform/utils/drag-helpers"
import type { Lesson } from "@thicket/types"

interface CurriculumBuilderProps {
  lessons: Lesson[]
  onChange: (lessons: Lesson[]) => void
  onEditLesson: (lesson: Lesson, index: number) => void
}

interface CourseStructureSetupProps {
  onCreateStructure: (weekCount: number) => void
}

function CourseStructureSetup({ onCreateStructure }: CourseStructureSetupProps) {
  const [weekCount, setWeekCount] = useState(8)

  return (
    <div className="bg-brand-50 border-brand-200 mb-4 rounded-lg border-2 px-6 py-8">
      <div className="mx-auto max-w-md text-center">
        <div className="bg-brand-100 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Calendar className="text-brand-700 h-8 w-8" />
        </div>
        <h3 className="text-foreground font-display mb-2 text-lg font-bold">
          Define Your Course Structure
        </h3>
        <p className="text-muted-foreground mb-6 text-sm">
          How many weeks will your course run? Maximum 12 weeks. You can add or remove weeks later.
        </p>

        <div className="mb-6 flex items-center justify-center gap-3">
          <label className="text-muted-foreground text-sm font-medium">Choose weeks:</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekCount(Math.max(1, weekCount - 1))}
              disabled={weekCount <= 1}
              className="text-muted-foreground hover:text-foreground hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed flex h-9 w-9 items-center justify-center rounded-lg border border-default bg-white transition-all duration-200"
              aria-label="Decrease week count"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={weekCount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "")
                if (value === "") return
                const numValue = parseInt(value)
                if (!isNaN(numValue)) {
                  setWeekCount(Math.max(1, Math.min(12, numValue)))
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setWeekCount(Math.min(12, weekCount + 1))
                } else if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setWeekCount(Math.max(1, weekCount - 1))
                }
              }}
              className="focus:ring-brand-500 text-foreground border-default hover:border-strong w-16 rounded-lg border bg-white px-3 py-2 text-center text-base transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setWeekCount(Math.min(12, weekCount + 1))}
              disabled={weekCount >= 12}
              className="text-muted-foreground hover:text-foreground hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed flex h-9 w-9 items-center justify-center rounded-lg border border-default bg-white transition-all duration-200"
              aria-label="Increase week count"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <span className="text-muted-foreground text-sm">weeks</span>
        </div>

        <Button
          variant="brand"
          size="md"
          onClick={() => onCreateStructure(weekCount)}
          className="max-w-xs mx-auto"
        >
          Generate Course Structure
        </Button>
      </div>
    </div>
  )
}

interface CourseSummaryProps {
  lessons: Lesson[]
  onAddMoreWeeks: (count: number) => void
}

function CourseSummary({ lessons, onAddMoreWeeks }: CourseSummaryProps) {
  const completeLessons = lessons.filter(
    (l) => l.title && l.topics.length > 0
  ).length
  const totalTopics = lessons.reduce((sum, lesson) => sum + lesson.topics.length, 0)
  const totalAssignments = lessons.reduce((sum, lesson) => sum + (lesson.assignments?.length || 0), 0)
  const progressPercentage = lessons.length > 0
    ? Math.round((completeLessons / lessons.length) * 100)
    : 0

  return (
    <div className="border-default mb-6 rounded-lg border bg-white px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-end gap-2">
            <div>
              <p className="text-muted mb-1 text-xs uppercase tracking-wide">Progress</p>
              <div className="bg-neutral-200 h-2 w-24 overflow-hidden rounded-full">
                <div
                  className="bg-brand-600 h-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            <span className="text-brand-700 mb-0.5 text-sm font-bold">{progressPercentage}%</span>
          </div>
          <div className="bg-neutral-200 h-8 w-px" />
          <div className="flex gap-6">
            <div>
              <p className="text-muted mb-1 text-xs uppercase tracking-wide">Total</p>
              <p className="text-foreground text-lg font-bold leading-none">{lessons.length}</p>
            </div>
            <div>
              <p className="text-muted mb-1 text-xs uppercase tracking-wide">Complete</p>
              <p className="text-success text-lg font-bold leading-none">{completeLessons}</p>
            </div>
            <div>
              <p className="text-muted mb-1 text-xs uppercase tracking-wide">Topics</p>
              <p className="text-foreground text-lg font-bold leading-none">{totalTopics}</p>
            </div>
            <div>
              <p className="text-muted mb-1 text-xs uppercase tracking-wide">Resources</p>
              <p className="text-foreground text-lg font-bold leading-none">{totalAssignments}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {lessons.length < 12 && (
            <button
              type="button"
              onClick={() => onAddMoreWeeks(Math.min(4, 12 - lessons.length))}
              className="text-brand-700 hover:bg-neutral-100 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              + Add {Math.min(4, 12 - lessons.length)} Week{Math.min(4, 12 - lessons.length) > 1 ? 's' : ''}
            </button>
          )}
          {lessons.length >= 12 && (
            <span className="text-muted text-xs italic">
              Maximum 12 weeks reached
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface CourseStructureOverviewProps {
  lessons: Lesson[]
  onJumpToLesson: (lesson: Lesson, index: number) => void
}

function CourseStructureOverview({ lessons, onJumpToLesson }: CourseStructureOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (lessons.length === 0) return null

  const completeLessons = lessons.filter(
    (l) => l.title && l.topics.length > 0
  ).length
  const partialLessons = lessons.filter(
    (l) => !(!l.title && l.topics.length === 0) && !(l.title && l.topics.length > 0)
  ).length
  const emptyLessons = lessons.length - completeLessons - partialLessons

  const getStatusColor = (lesson: Lesson) => {
    const isEmpty = !lesson.title && lesson.topics.length === 0
    const isComplete = lesson.title && lesson.topics.length > 0

    if (isEmpty) return "bg-gray-200 text-gray-600"
    if (isComplete) return "bg-success text-white"
    return "bg-warning text-white"
  }

  const getStatusIcon = (lesson: Lesson) => {
    const isComplete = lesson.title && lesson.topics.length > 0

    if (isComplete) return <CheckCircle2 className="h-3 w-3" />
    return null
  }

  return (
    <div className="border-default mb-6 rounded-lg border bg-white p-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Grid3x3 className="text-brand-600 h-5 w-5" />
          <h3 className="text-foreground font-display text-base font-bold">
            Course Structure Overview
          </h3>
          <span className="text-muted text-xs">
            ({completeLessons} of {lessons.length} complete)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="text-muted-foreground h-5 w-5" />
        ) : (
          <ChevronDown className="text-muted-foreground h-5 w-5" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="bg-success h-3 w-3 rounded-full" />
              <span className="text-muted">Complete ({completeLessons})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-warning h-3 w-3 rounded-full" />
              <span className="text-muted">Partial ({partialLessons})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-gray-200 h-3 w-3 rounded-full" />
              <span className="text-muted">Empty ({emptyLessons})</span>
            </div>
          </div>

          <div className="grid grid-cols-8 gap-2">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onJumpToLesson(lesson, index)}
                className={`group relative flex h-10 items-center justify-center rounded-lg transition-all hover:scale-105 hover:shadow-md ${getStatusColor(lesson)}`}
                title={lesson.title || `Week ${index + 1} - Untitled`}
              >
                <span className="text-xs font-bold">{index + 1}</span>
                {getStatusIcon(lesson) && (
                  <div className="absolute -right-1 -top-1">
                    {getStatusIcon(lesson)}
                  </div>
                )}
                {lesson.title && (
                  <div className="bg-gray-900 text-white absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded px-2 py-1 text-xs group-hover:block">
                    Week {index + 1}: {lesson.title}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SortableLessonProps {
  lesson: Lesson
  index: number
  onEditLesson: (lesson: Lesson, index: number) => void
  onRemoveLesson: (index: number) => void
  onDuplicateLesson: (index: number) => void
}

function SortableLesson({
  lesson,
  index,
  onEditLesson,
  onRemoveLesson,
  onDuplicateLesson,
}: SortableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `lesson-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isEmpty = !lesson.title && lesson.topics.length === 0
  const assignmentCount = lesson.assignments?.length || 0
  const topicCount = lesson.topics.length
  const isComplete = lesson.title && topicCount > 0
  const isPartial = !isEmpty && !isComplete

  return (
    <div
      ref={setNodeRef}
      id={`lesson-card-${index}`}
      style={style}
      className="group overflow-hidden rounded-lg border border-default bg-surface-50 transition-all duration-250 hover:border-strong hover:shadow-sm"
    >
      <div className="flex items-center gap-4 px-6 py-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="text-muted hover:text-foreground h-5 w-5 transition-colors" />
        </div>

        <div className="bg-brand-100 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <span className="text-brand-700 text-sm font-bold">
            {index + 1}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {isEmpty ? (
            <p className="text-muted text-sm italic">
              Week {index + 1} - Untitled
            </p>
          ) : (
            <>
              <h3 className="text-foreground font-display text-lg font-semibold">
                Week {index + 1}: {lesson.title || "Untitled"}
              </h3>
              {lesson.description && (
                <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                  {lesson.description}
                </p>
              )}
              <div className="mt-1 flex items-center gap-3">
                {topicCount > 0 && (
                  <span className="text-muted text-xs">
                    {topicCount} topic{topicCount !== 1 ? "s" : ""}
                  </span>
                )}
                {assignmentCount > 0 && (
                  <span className="text-muted flex items-center gap-1 text-xs">
                    <FileText className="h-3 w-3" />
                    {assignmentCount} file{assignmentCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isComplete && (
            <span className="bg-success/10 text-success rounded-full px-2 py-1 text-xs font-medium">
              Complete
            </span>
          )}
          {isPartial && (
            <span className="bg-warning/10 text-warning rounded-full px-2 py-1 text-xs font-medium">
              Partial
            </span>
          )}
          {isEmpty && (
            <span className="bg-tertiary/10 text-muted rounded-full px-2 py-1 text-xs font-medium">
              Empty
            </span>
          )}
          <button
            type="button"
            onClick={() => onEditLesson(lesson, index)}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-100 rounded p-1.5 transition-colors"
            title="Edit lesson"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicateLesson(index)}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-100 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-all"
            title="Duplicate lesson"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemoveLesson(index)}
            className="text-error hover:bg-error/10 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-all"
            title="Delete lesson"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function CurriculumBuilder({
  lessons,
  onChange,
  onEditLesson,
}: CurriculumBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useDragSensors()

  const handleAddLesson = () => {
    if (lessons.length >= 12) return

    const newLesson: Lesson = {
      id: Date.now(),
      position: lessons.length + 1,
      title: "",
      description: "",
      topics: [],
      assignments: [],
    }
    onChange([...lessons, newLesson])
    onEditLesson(newLesson, lessons.length)
  }

  const handleRemoveLesson = (index: number) => {
    const updated = lessons.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleDuplicateLesson = (index: number) => {
    const lessonToDuplicate = lessons[index]
    const duplicatedLesson: Lesson = {
      ...lessonToDuplicate,
      id: Date.now(),
      position: index + 2,
      title: `${lessonToDuplicate.title} (Copy)`,
    }
    const updated = [
      ...lessons.slice(0, index + 1),
      duplicatedLesson,
      ...lessons.slice(index + 1),
    ]
    onChange(updated)
  }

  const handleCreateStructure = (weekCount: number) => {
    const newLessons: Lesson[] = Array.from({ length: weekCount }, (_, i) => ({
      id: Date.now() + i,
      position: i + 1,
      title: "",
      description: "",
      topics: [],
      assignments: [],
    }))
    onChange(newLessons)
  }

  const handleJumpToLesson = (lesson: Lesson, index: number) => {
    const lessonElement = document.getElementById(`lesson-card-${index}`)
    if (lessonElement) {
      lessonElement.scrollIntoView({ behavior: "smooth", block: "center" })
      lessonElement.classList.add("ring-2", "ring-brand-500")
      setTimeout(() => {
        lessonElement.classList.remove("ring-2", "ring-brand-500")
      }, 2000)
    }
  }

  const handleAddMoreWeeks = (count: number) => {
    const remainingSpace = 12 - lessons.length
    const weeksToAdd = Math.min(count, remainingSpace)

    if (weeksToAdd <= 0) return

    const startId = Date.now()
    const startPosition = lessons.length + 1
    const newLessons: Lesson[] = Array.from({ length: weeksToAdd }, (_, i) => ({
      id: startId + i,
      position: startPosition + i,
      title: "",
      description: "",
      topics: [],
      assignments: [],
    }))
    onChange([...lessons, ...newLessons])
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

    const oldIndex = lessons.findIndex((_, index) => `lesson-${index}` === active.id)
    const newIndex = lessons.findIndex((_, index) => `lesson-${index}` === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(lessons, oldIndex, newIndex)
      onChange(reordered)
    }
  }

  const activeLesson = activeId
    ? lessons[lessons.findIndex((_, index) => `lesson-${index}` === activeId)]
    : null

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="text-brand-600 h-6 w-6" />
          <h2 className="font-display text-foreground text-xl font-bold">
            Course Schedule
          </h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Build your weekly lesson plan. Each lesson represents one week of instruction. Drag to reorder.
        </p>

        {lessons.length > 0 && (
          <CourseSummary
            lessons={lessons}
            onAddMoreWeeks={handleAddMoreWeeks}
          />
        )}

        <CourseStructureOverview
          lessons={lessons}
          onJumpToLesson={handleJumpToLesson}
        />

        {lessons.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={lessons.map((_, index) => `lesson-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="mb-4 space-y-4 overflow-y-auto"
                style={{
                  maxHeight: lessons.length >= 8 ? "calc(7 * 88px + 6 * 16px)" : "auto",
                }}
              >
                {lessons.map((lesson, index) => (
                  <SortableLesson
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    onEditLesson={onEditLesson}
                    onRemoveLesson={handleRemoveLesson}
                    onDuplicateLesson={handleDuplicateLesson}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeLesson ? (
                <div className="overflow-hidden rounded-lg border border-strong bg-surface-50 shadow-lg">
                  <div className="flex items-center gap-4 px-6 py-4">
                    <GripVertical className="text-muted h-5 w-5" />
                    <div className="bg-brand-100 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <span className="text-brand-700 text-sm font-bold">
                        {lessons.findIndex((_, index) => `lesson-${index}` === activeId) + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground font-display text-lg font-semibold">
                        Week {lessons.findIndex((_, index) => `lesson-${index}` === activeId) + 1}: {activeLesson.title || "Untitled"}
                      </h3>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <CourseStructureSetup onCreateStructure={handleCreateStructure} />
        )}

        {lessons.length > 0 && lessons.length < 12 && (
          <>
            <Button
              variant="outline"
              size="md"
              onClick={handleAddLesson}
              icon={Plus}
              fullWidth
            >
              Add New Lesson
            </Button>

            <p className="text-muted mt-3 text-center text-xs">
              {lessons.length} week{lessons.length !== 1 ? "s" : ""} • 1 hour per session
            </p>
          </>
        )}
        {lessons.length >= 12 && (
          <p className="text-muted mt-3 text-center text-xs">
            {lessons.length} weeks • 1 hour per session
          </p>
        )}
      </div>
    </div>
  )
}
