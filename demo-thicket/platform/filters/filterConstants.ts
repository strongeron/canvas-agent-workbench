export const FILTER_BUTTON_BASE =
  "font-display bg-surface-50 text-muted-foreground border-default hover:bg-surface-100 hover:border-strong flex cursor-pointer items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200"

export const FILTER_DROPDOWN_BASE =
  "bg-surface-50 border-default absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border-2 shadow-lg md:left-auto"

export const FILTER_OPTION_BASE =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150"

export const FILTER_OPTION_SELECTED = "bg-brand-50 text-brand-700 font-semibold"

export const FILTER_OPTION_UNSELECTED = "text-foreground hover:bg-surface-100"

export const FILTER_BADGE_BASE =
  "bg-brand-600 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"

export const FILTER_CLEAR_BUTTON =
  "text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-2 text-sm font-medium transition-colors"

export const FILTER_DROPDOWN_WIDTHS = {
  auto: "",
  sm: "md:w-48",
  md: "md:w-64",
  lg: "md:w-80",
} as const
