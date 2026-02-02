import { router, usePage } from "../shims/inertia-react"
import type { LucideIcon } from "lucide-react"
import {
  BadgeCheck,
  BookOpen,
  Building2,
  ChevronDown,
  Film,
  FlaskConical,
  Globe2,
  LayoutGrid,
  Lightbulb,
  Palette,
  Scroll,
  Tag,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  FILTER_BADGE_BASE,
  FILTER_BUTTON_BASE,
  FILTER_CLEAR_BUTTON,
  FILTER_DROPDOWN_BASE,
  FILTER_OPTION_BASE,
  FILTER_OPTION_SELECTED,
  FILTER_OPTION_UNSELECTED,
} from "../platform/filters/filterConstants"
import type { Category, CoursesIndex } from "../types"

const iconMap: Record<string, LucideIcon> = {
  building: Building2,
  palette: Palette,
  globe: Globe2,
  scroll: Scroll,
  book: BookOpen,
  lightbulb: Lightbulb,
  flask: FlaskConical,
  film: Film,
  users: Tag,
  clock: Scroll,
  badge: BadgeCheck,
}

interface CategoryFilterProps {
  variant?: "dropdown" | "horizontal"
  categories?: Category[]
  currentCategoryId?: number | null
  onCategoryChange?: (categoryId: number | null) => void
}

export function CategoryFilter(props?: CategoryFilterProps) {
  const variant = props?.variant ?? "dropdown"
  const page = usePage<{
    categories?: Category[]
    current_category_id?: number | null
    url?: string
  }>()

  const pageProps = page?.props ?? {}

  const categories = props?.categories ?? pageProps.categories ?? []
  const current_category_id =
    props?.currentCategoryId !== undefined
      ? props.currentCategoryId
      : pageProps.current_category_id ?? null
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCategoryData = current_category_id
    ? categories.find((cat) => cat.id === current_category_id)
    : null

  const SelectedIcon = selectedCategoryData
    ? iconMap[selectedCategoryData.icon] || Tag
    : LayoutGrid
  const selectedLabel = selectedCategoryData?.name ?? "Category"
  const hasActiveFilter = current_category_id !== null
  const showBadge = false

  const handleClick = (categoryId?: number) => {
    setIsOpen(false)

    if (props?.onCategoryChange) {
      props.onCategoryChange(categoryId ?? null)
      return
    }

    router.replace({
      props: (currentProps: CoursesIndex) => ({
        ...currentProps,
        current_category_id: categoryId ?? null,
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

  if (!categories || categories.length === 0) {
    return null
  }

  if (variant === "horizontal") {
    return (
      <div
        className="flex justify-center gap-3 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-visible"
        role="group"
        aria-label="Filter courses by category"
      >
        <button
          type="button"
          onClick={() => handleClick()}
          className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-display font-semibold transition-all duration-200 ${
            !current_category_id
              ? "bg-brand-600 text-white"
              : "bg-white border-2 border-neutral-300 text-neutral-700 hover:bg-surface-100 hover:border-neutral-400"
          }`}
          aria-pressed={!current_category_id}
          aria-current={!current_category_id ? "true" : undefined}
        >
          <LayoutGrid className="h-4 w-4" strokeWidth={2.5} />
          <span>All</span>
        </button>

        {categories.map((category) => {
          const IconComponent = iconMap[category.icon] || Tag
          const isSelected = current_category_id === category.id

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleClick(category.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-display font-semibold transition-all duration-200 ${
                isSelected
                  ? "bg-brand-600 text-white"
                  : "bg-white border-2 border-neutral-300 text-neutral-700 hover:bg-surface-100 hover:border-neutral-400"
              }`}
              aria-pressed={isSelected}
              aria-current={isSelected ? "true" : undefined}
            >
              <IconComponent className="h-4 w-4" strokeWidth={2.5} />
              <span>{category.name}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={FILTER_BUTTON_BASE}
      >
        <SelectedIcon className="h-4 w-4" strokeWidth={2.5} />
        <span>{selectedLabel}</span>
        {showBadge && hasActiveFilter && (
          <span className={FILTER_BADGE_BASE}>
            1
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen && (
        <div className={`${FILTER_DROPDOWN_BASE} md:w-64`}>
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="space-y-1">
              <button
                onClick={() => handleClick()}
                className={`${FILTER_OPTION_BASE} ${
                  !current_category_id
                    ? FILTER_OPTION_SELECTED
                    : FILTER_OPTION_UNSELECTED
                }`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                <span className="text-sm font-medium">All Categories</span>
              </button>

              {categories.map((category) => {
                const IconComponent = iconMap[category.icon] || Tag
                const isSelected = current_category_id === category.id

                return (
                  <button
                    onClick={() => handleClick(category.id)}
                    key={category.id}
                    className={`${FILTER_OPTION_BASE} ${
                      isSelected
                        ? FILTER_OPTION_SELECTED
                        : FILTER_OPTION_UNSELECTED
                    }`}
                  >
                    <IconComponent
                      className="h-4 w-4 shrink-0"
                      strokeWidth={2.5}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {hasActiveFilter && (
            <div className="border-default border-t p-3">
              <button
                onClick={() => handleClick()}
                className={FILTER_CLEAR_BUTTON}
              >
                <X className="h-4 w-4" />
                Clear Category Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
