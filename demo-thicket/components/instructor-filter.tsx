import { router, usePage } from "@thicket/shims/inertia-react"
import { ChevronDown, Users, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ImagePlaceholder } from "@thicket/components/ui/image-placeholder"
import type { AuthorProfile } from "@thicket/types"

export function InstructorFilter() {
  const props = usePage<{
    instructors?: AuthorProfile[]
    current_instructor_id?: number | null
  }>().props

  const instructors = props.instructors || []
  const current_instructor_id = props.current_instructor_id || null

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedInstructor = current_instructor_id
    ? instructors.find((inst) => inst.id === current_instructor_id)
    : null

  const hasActiveFilter = current_instructor_id !== null

  const handleClick = (instructorId?: number) => {
    setIsOpen(false)
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        current_instructor_id: instructorId ?? null,
      }),
      preserveScroll: true,
      preserveState: true,
    })
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  if (!instructors || instructors.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="font-display bg-surface-50 text-muted-foreground border-default hover:bg-surface-100 hover:border-strong flex cursor-pointer items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200"
      >
        {selectedInstructor?.avatar_url ? (
          <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full border-2 border-current">
            <img
              src={selectedInstructor.avatar_url}
              alt={selectedInstructor.name}
              className="pointer-events-none h-full w-full object-cover object-center"
            />
          </div>
        ) : (
          <Users className="h-4 w-4" strokeWidth={2.5} />
        )}
        <span>{selectedInstructor?.name ?? "Instructor"}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen && (
        <div className="bg-surface-50 border-default absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border-2 shadow-lg md:left-auto md:w-72">
          <div className="border-default flex items-center justify-between border-b px-4 py-3">
            <span className="text-foreground text-sm font-semibold">
              Filter by Instructor
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-3">
            <button
              onClick={() => handleClick()}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                !current_instructor_id
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-foreground hover:bg-surface-100"
              }`}
            >
              <Users className="h-5 w-5 shrink-0" strokeWidth={2} />
              <span className="text-sm font-medium">All Instructors</span>
            </button>

            <div className="border-default my-2 border-t" />

            <div className="space-y-1">
              {instructors.map((instructor) => {
                const isSelected = current_instructor_id === instructor.id

                return (
                  <button
                    onClick={() => handleClick(instructor.id)}
                    key={instructor.id}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                      isSelected
                        ? "bg-brand-50 text-brand-700 font-semibold"
                        : "text-foreground hover:bg-surface-100"
                    }`}
                  >
                    <div className="border-default h-8 w-8 shrink-0 overflow-hidden rounded-full border-2">
                      {!instructor.avatar_url ? (
                        <ImagePlaceholder
                          type="instructor"
                          size="sm"
                          className="rounded-full"
                        />
                      ) : (
                        <img
                          src={instructor.avatar_url}
                          alt={instructor.name}
                          className="pointer-events-none h-full w-full object-cover object-center"
                        />
                      )}
                    </div>
                    <span className="text-sm font-medium">{instructor.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {hasActiveFilter && (
            <div className="border-default border-t p-3">
              <button
                onClick={() => handleClick()}
                className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="h-4 w-4" />
                Clear Instructor Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
