import {
  ArrowDownAZ,
  ArrowUpAZ,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

export type SortOrder =
  | "newest"
  | "oldest"
  | "published"
  | "shortest"
  | "longest"
  | "price_low"
  | "price_high"

export interface BrowseSortProps {
  sortOrder: SortOrder
  onSortChange: (sort: SortOrder) => void
}

const sortOptions: {
  value: SortOrder
  label: string
  icon: typeof ArrowDownAZ
}[] = [
  { value: "newest", label: "Newest First", icon: ArrowDownAZ },
  { value: "oldest", label: "Oldest First", icon: ArrowUpAZ },
  { value: "published", label: "Published First", icon: CheckCircle2 },
  { value: "shortest", label: "Shortest Courses", icon: Clock },
  { value: "longest", label: "Longest Courses", icon: Clock },
  { value: "price_low", label: "Lowest Price", icon: DollarSign },
  { value: "price_high", label: "Highest Price", icon: DollarSign },
]

export function BrowseSort({ sortOrder, onSortChange }: BrowseSortProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption =
    sortOptions.find((opt) => opt.value === sortOrder) || sortOptions[0]

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

  const handleSortChange = (sort: SortOrder) => {
    onSortChange(sort)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="font-display bg-surface-50 text-muted-foreground border-default hover:bg-surface-100 hover:border-strong flex cursor-pointer items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200"
      >
        <selectedOption.icon className="h-4 w-4" strokeWidth={2.5} />
        <span className="hidden sm:inline">Sort:</span>
        <span>{selectedOption.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen && (
        <div className="bg-surface-50 border-default absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border-2 shadow-lg md:left-auto md:w-64">
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="space-y-1">
              {sortOptions.map((option) => {
                const isSelected = sortOrder === option.value
                const Icon = option.icon

                return (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                      isSelected
                        ? "bg-brand-50 text-brand-700 font-semibold"
                        : "text-foreground hover:bg-surface-100"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
