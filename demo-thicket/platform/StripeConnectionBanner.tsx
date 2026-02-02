import { CreditCard } from "lucide-react"

import { Button } from "../components/ui/button"

interface StripeConnectionBannerProps {
  onConnect: () => void
}

export function StripeConnectionBanner({
  onConnect,
}: StripeConnectionBannerProps) {
  return (
    <div className="shadow-card mb-8 rounded-xl border border-brand-200 bg-brand-50 p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100">
            <CreditCard className="h-6 w-6 text-brand-700" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="mb-2 text-lg font-bold text-brand-900">
            Complete your Stripe setup
          </h3>

          <p className="text-brand-800 mb-4 leading-relaxed">
            To receive payments, you need to connect your Stripe account. This
            process takes about 5 minutes.
          </p>

          <div className="mb-6">
            <h4 className="text-brand-900 mb-2 text-sm font-semibold">
              What is Stripe Connect?
            </h4>
            <ul className="text-brand-800 space-y-1 text-sm">
              <li>• Secure payment processing for your courses</li>
              <li>• Automatic transfers to your bank account</li>
              <li>• Professional invoicing and receipts</li>
              <li>• Full transaction history and reporting</li>
            </ul>
          </div>

          <Button variant="brand" size="md" onClick={onConnect}>
            Start Stripe Connect Setup
          </Button>
        </div>
      </div>
    </div>
  )
}
