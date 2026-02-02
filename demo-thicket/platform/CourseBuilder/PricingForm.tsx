import { DollarSign } from "lucide-react"

import { Select } from "@thicket/components/ui/select"

interface PricingFormProps {
  price: number | null
  lessonsCount: number
  lessonLength: number
  onPriceChange: (value: number | null) => void
  onLessonLengthChange: (value: number) => void
  error?: string
}

export function PricingForm({
  price,
  lessonsCount,
  lessonLength,
  onPriceChange,
  onLessonLengthChange,
  error,
}: PricingFormProps) {
  const totalRevenue = price && lessonsCount > 0 ? price * lessonsCount : null

  const getPriceSuggestion = (length: number): string => {
    switch (length) {
      case 1:
        return "$25-$35 per lesson"
      case 1.5:
        return "$35-$50 per lesson"
      case 2:
        return "$45-$65 per lesson"
      case 2.5:
        return "$55-$80 per lesson"
      case 3:
        return "$65-$95 per lesson"
      default:
        return "$25-$35 per lesson"
    }
  }

  const getLessonLengthLabel = (length: number): string => {
    return length === 1 ? "1 hour" : `${length} hours`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-foreground mb-2 text-xl font-bold">
          Course Pricing
        </h2>
        <p className="text-muted-foreground text-sm">
          Set your lesson length and price per lesson. Students will pay this amount for each session.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <Select
            label="Lesson Length"
            value={lessonLength.toString()}
            onChange={(value) => {
              const numericValue = typeof value === "number" ? value : parseFloat(value)
              onLessonLengthChange(numericValue)
            }}
          >
            <option value="1">1 hour</option>
            <option value="1.5">1.5 hours</option>
            <option value="2">2 hours</option>
            <option value="2.5">2.5 hours</option>
            <option value="3">3 hours</option>
          </Select>
          <p className="text-muted mt-2 text-sm">
            All lessons in your course will be {getLessonLengthLabel(lessonLength)} long
          </p>
        </div>
        <div className="relative">
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            Price per Lesson
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <DollarSign className="text-muted-foreground h-5 w-5" />
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={price === null ? "" : price === 0 ? "0" : price.toString()}
              onChange={(e) => {
                const value = e.target.value.trim()
                if (value === "") {
                  onPriceChange(null)
                  return
                }
                const cleaned = value.replace(/[^0-9.]/g, "")
                const parts = cleaned.split(".")
                if (parts.length > 2) return
                if (parts[1] && parts[1].length > 2) return
                const numValue = parseFloat(cleaned)
                if (!isNaN(numValue) && numValue >= 0) {
                  onPriceChange(numValue)
                }
              }}
              placeholder="--"
              className={`h-11 focus:ring-brand-500 text-foreground w-full rounded-lg border ${
                error ? "border-error" : "border-default hover:border-strong"
              } bg-white px-4 py-3 pl-10 pr-4 text-base transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2`}
            />
          </div>
          {error && <p className="text-error mt-2 text-sm">{error}</p>}
          {!error && (
            <p className="text-muted mt-2 text-sm">
              We suggest {getPriceSuggestion(lessonLength)}
            </p>
          )}
        </div>

        {lessonsCount > 0 && totalRevenue !== null && (
          <div className="rounded-lg border border-default bg-brand-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Estimated Total Course Revenue
                </p>
                <p className="text-muted text-xs mt-0.5">
                  {lessonsCount} lesson{lessonsCount !== 1 ? "s" : ""} × ${price}
                </p>
              </div>
              <p className="text-brand-700 text-2xl font-bold">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
