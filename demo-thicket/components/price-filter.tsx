import { router, usePage } from "../shims/inertia-react"
import { ChevronDown, DollarSign, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface PriceRange {
  min: number | null
  max: number | null
}

const pricePresets: { label: string; range: PriceRange }[] = [
  { label: "Free", range: { min: 0, max: 0 } },
  { label: "Under $50", range: { min: 0, max: 49 } },
  { label: "$50-$100", range: { min: 50, max: 100 } },
  { label: "$100-$200", range: { min: 100, max: 200 } },
  { label: "Over $200", range: { min: 200, max: null } },
]

export function PriceFilter() {
  const props = usePage<{
    current_price_range?: PriceRange
  }>().props

  const current_price_range = props.current_price_range || {
    min: null,
    max: null,
  }

  const [isOpen, setIsOpen] = useState(false)
  const [customMin, setCustomMin] = useState<string>("")
  const [customMax, setCustomMax] = useState<string>("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const hasActiveFilter =
    current_price_range.min !== null || current_price_range.max !== null

  const getActiveLabel = (): string => {
    if (!hasActiveFilter) return "Any Price"

    const matchingPreset = pricePresets.find(
      (preset) =>
        preset.range.min === current_price_range.min &&
        preset.range.max === current_price_range.max
    )

    if (matchingPreset) return matchingPreset.label

    const { min, max } = current_price_range
    if (min !== null && max !== null) return `$${min}-$${max}`
    if (min !== null) return `Over $${min}`
    if (max !== null) return `Under $${max}`
    return "Custom Range"
  }

  const handlePresetClick = (range: PriceRange) => {
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        current_price_range: range,
      }),
      preserveScroll: true,
      preserveState: true,
    })
    setIsOpen(false)
  }

  const handleCustomApply = () => {
    const min = customMin ? parseInt(customMin, 10) : null
    const max = customMax ? parseInt(customMax, 10) : null

    if (min !== null && max !== null && min > max) {
      return
    }

    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        current_price_range: { min, max },
      }),
      preserveScroll: true,
      preserveState: true,
    })
    setIsOpen(false)
    setCustomMin("")
    setCustomMax("")
  }

  const handleClearAll = () => {
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        current_price_range: { min: null, max: null },
      }),
      preserveScroll: true,
      preserveState: true,
    })
    setIsOpen(false)
    setCustomMin("")
    setCustomMax("")
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

  const isPresetActive = (range: PriceRange): boolean => {
    return (
      current_price_range.min === range.min &&
      current_price_range.max === range.max
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="font-display bg-surface-50 text-muted-foreground border-default hover:bg-surface-100 hover:border-strong flex cursor-pointer items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200"
      >
        <DollarSign className="h-4 w-4" strokeWidth={2.5} />
        <span>{getActiveLabel()}</span>
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
              Filter by Price
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <div className="p-3">
              <div className="mb-3">
                <span className="text-muted-foreground mb-2 block text-xs font-medium uppercase tracking-wide">
                  Quick Select
                </span>
                <div className="space-y-2">
                  {pricePresets.map((preset) => {
                    const isActive = isPresetActive(preset.range)

                    return (
                      <button
                        key={preset.label}
                        onClick={() => handlePresetClick(preset.range)}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? "bg-brand-50 text-brand-700 font-semibold"
                            : "text-foreground hover:bg-surface-100"
                        }`}
                      >
                        <DollarSign className="h-4 w-4" strokeWidth={2} />
                        <span className="text-sm font-medium">
                          {preset.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="border-default border-t pt-3">
                <span className="text-muted-foreground mb-2 block text-xs font-medium uppercase tracking-wide">
                  Custom Range
                </span>
                <div className="space-y-2">
                  <div>
                    <label
                      htmlFor="min-price"
                      className="text-muted-foreground mb-1 block text-xs font-medium"
                    >
                      Min Price
                    </label>
                    <div className="relative">
                      <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                        $
                      </span>
                      <input
                        id="min-price"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={customMin}
                        onChange={(e) => setCustomMin(e.target.value)}
                        className="border-default text-foreground focus:ring-brand-500 focus:border-brand-500 w-full rounded-lg border px-3 py-2 pl-6 text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="max-price"
                      className="text-muted-foreground mb-1 block text-xs font-medium"
                    >
                      Max Price
                    </label>
                    <div className="relative">
                      <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                        $
                      </span>
                      <input
                        id="max-price"
                        type="number"
                        min="0"
                        placeholder="Any"
                        value={customMax}
                        onChange={(e) => setCustomMax(e.target.value)}
                        className="border-default text-foreground focus:ring-brand-500 focus:border-brand-500 w-full rounded-lg border px-3 py-2 pl-6 text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCustomApply}
                    disabled={!customMin && !customMax}
                    className="bg-brand-600 hover:bg-brand-700 disabled:bg-surface-200 disabled:text-muted-foreground w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed"
                  >
                    Apply Custom Range
                  </button>
                </div>
              </div>
            </div>
          </div>

          {hasActiveFilter && (
            <div className="border-default border-t p-3">
              <button
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="h-4 w-4" />
                Clear Price Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
