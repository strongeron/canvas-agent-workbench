import { CheckCircle2, CreditCard } from "lucide-react"

import { Button } from "@thicket/components/ui/button"

interface StripeConnectCardProps {
  isCompleted: boolean
  onConnect: () => void
}

export function StripeConnectCard({
  isCompleted,
  onConnect,
}: StripeConnectCardProps) {
  return (
    <div
      className={`shadow-card group relative overflow-hidden rounded-xl border transition-all ${
        isCompleted
          ? "border-brand-300 bg-brand-50"
          : "border-neutral-200 bg-neutral-50 hover:shadow-card-hover"
      }`}
    >
      <div className="p-6">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
          isCompleted ? "bg-brand-100" : "bg-neutral-100"
        }`}>
          <CreditCard className={`h-6 w-6 ${
            isCompleted ? "text-brand-700" : "text-neutral-600"
          }`} />
        </div>

        <div className="mb-2 flex items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            isCompleted ? "bg-brand-200" : "bg-neutral-200"
          }`}>
            <span className={`text-sm font-bold ${
              isCompleted ? "text-brand-900" : "text-neutral-700"
            }`}>1</span>
          </div>
          <h4 className={`text-lg font-bold ${
            isCompleted ? "text-brand-900" : "text-neutral-800"
          }`}>
            Connect Stripe
          </h4>
        </div>

        <p className={`mb-4 text-sm leading-relaxed ${
          isCompleted ? "text-brand-800" : "text-neutral-600"
        }`}>
          Set up secure payment processing to receive earnings from your
          courses. Takes about 5 minutes.
        </p>

        {isCompleted ? (
          <div className="flex items-center gap-2 rounded-lg bg-brand-100 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-700" />
            <span className="text-brand-900 text-sm font-medium">
              Connected
            </span>
          </div>
        ) : (
          <Button
            variant="brand"
            size="sm"
            fullWidth
            onClick={onConnect}
          >
            Connect Now
          </Button>
        )}
      </div>
    </div>
  )
}
