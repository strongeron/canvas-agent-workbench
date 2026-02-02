import type { LucideIcon } from "lucide-react"

export type FilterMode = "single" | "multi"
export type BadgeDisplay = "never" | "always" | "count"
export type DisplayMode = "dropdown" | "button" | "static"
export type DropdownWidth = "auto" | "sm" | "md" | "lg"

export interface FilterOption<T = string | number> {
  value: T
  label: string
  icon?: LucideIcon
  description?: string
}

export interface FilterConfig {
  mode: FilterMode
  showBadge: BadgeDisplay
  displayMode: DisplayMode
  icon: LucideIcon
  label: string
  allLabel?: string
  clearLabel?: string
  dropdownWidth?: DropdownWidth
}
