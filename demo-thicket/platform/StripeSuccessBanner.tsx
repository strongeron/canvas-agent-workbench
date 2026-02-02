import { CheckCircle2, ExternalLink, Sparkles, X } from "lucide-react"

import { Button } from "@thicket/components/ui/button"

interface StripeSuccessBannerProps {
  onDismiss: () => void
  onOpenDashboard: () => void
}

export function StripeSuccessBanner({
  onDismiss,
  onOpenDashboard,
}: StripeSuccessBannerProps) {
  return (
    <div className="shadow-card mb-8 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-brand-50 p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-lg font-bold text-emerald-900">
              Stripe Connected - Now You Can Earn
            </h3>
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>

          <p className="mb-4 leading-relaxed text-emerald-800">
            Your payment processing is set up! You can now receive earnings from
            students enrolling in your courses.
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDashboard}
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-100"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Stripe Dashboard
          </Button>
        </div>

        <button
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-100"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
