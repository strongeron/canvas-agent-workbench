import { Check, ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface Course {
  id: number
  name: string
}

interface CourseSelectorProps {
  courses: Course[]
  selectedCourseId: number | null
  onSelectCourse: (courseId: number | null) => void
  allCoursesLabel?: string
}

export function CourseSelector({
  courses,
  selectedCourseId,
  onSelectCourse,
  allCoursesLabel = "All Courses",
}: CourseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)
  const displayText = selectedCourse ? selectedCourse.name : allCoursesLabel

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isOpen])

  const handleSelect = (courseId: number | null) => {
    onSelectCourse(courseId)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="border-default text-foreground hover:bg-surface-50 hover:border-surface-300 focus:ring-brand-500 flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={`text-muted-foreground h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-default ring-opacity-5 absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border bg-white shadow-lg ring-1 ring-black">
          <ul
            className="max-h-60 overflow-auto py-1"
            role="listbox"
            aria-label="Course selection"
          >
            <li>
              <button
                onClick={() => handleSelect(null)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  selectedCourseId === null
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-foreground hover:bg-surface-50"
                }`}
                role="option"
                aria-selected={selectedCourseId === null}
              >
                <span>{allCoursesLabel}</span>
                {selectedCourseId === null && (
                  <Check className="text-brand-600 h-4 w-4" />
                )}
              </button>
            </li>

            {courses.length > 0 && (
              <>
                <li className="border-default mx-2 my-1 border-t" />
                {courses.map((course) => (
                  <li key={course.id}>
                    <button
                      onClick={() => handleSelect(course.id)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                        selectedCourseId === course.id
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "text-foreground hover:bg-surface-50"
                      }`}
                      role="option"
                      aria-selected={selectedCourseId === course.id}
                    >
                      <span className="truncate">{course.name}</span>
                      {selectedCourseId === course.id && (
                        <Check className="text-brand-600 h-4 w-4 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
