/**
 * @deprecated Legacy filter button component - replaced by UnifiedFilter
 * Archived on: 2024-12-03
 * Reason: Migrated to UnifiedFilter for consistent filtering patterns
 */
import { ChevronDown, type LucideIcon, X } from "lucide-react"
import { useState } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@thicket/components/ui/popover"

export interface FilterOption<T = string | number> {
  value: T
  label: string
  icon?: LucideIcon
}

interface FilterButtonProps<T> {
  icon: LucideIcon
  label: string
  value: T | null
  options: FilterOption<T>[]
  onChange: (value: T | null) => void
  allLabel?: string
  clearLabel?: string
  truncateLength?: number
  compact?: boolean
}

export function FilterButton<T extends string | number>({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  allLabel = "All",
  clearLabel = "Clear Filter",
  truncateLength = 200,
  compact: _compact = false,
}: FilterButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = value !== null ? options.find((opt) => opt.value === value) : null
  const selectedLabel = selectedOption?.label ?? allLabel
  const hasActiveFilter = value !== null

  const handleClick = (optionValue?: T) => {
    onChange(optionValue ?? null)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <button
          type="button"
          className="font-display bg-surface-50 text-muted-foreground border-default hover:bg-surface-100 hover:border-strong flex cursor-pointer items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200"
          aria-label={label}
        >
          <Icon className="h-4 w-4" strokeWidth={2.5} />
          <span
            className={`${truncateLength ? `max-w-[${truncateLength}px] truncate` : ""}`}
            style={truncateLength ? { maxWidth: `${truncateLength}px` } : undefined}
          >
            {selectedLabel}
          </span>
          {hasActiveFilter && (
            <span className="bg-brand-600 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white">
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
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="bg-surface-50 border-default w-full overflow-hidden rounded-xl border-2 shadow-lg md:w-64"
      >
        <div className="max-h-80 overflow-y-auto p-3">
          <div className="space-y-1">
            <button
              onClick={() => handleClick()}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                !value
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-foreground hover:bg-surface-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              <span className="text-sm font-medium">{allLabel}</span>
            </button>

            {options.map((option) => {
              const isSelected = value === option.value
              const OptionIcon = option.icon || Icon

              return (
                <button
                  onClick={() => handleClick(option.value)}
                  key={String(option.value)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                    isSelected
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-foreground hover:bg-surface-100"
                  }`}
                >
                  <OptionIcon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span className="text-sm font-medium line-clamp-2">
                    {option.label}
                  </span>
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
              {clearLabel}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
