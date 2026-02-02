import { CreditCard } from "lucide-react"

import { Button } from "../components/ui/button"

interface StripeConnectionCompactBannerProps {
  onConnect: () => void
}

export function StripeConnectionCompactBanner({
  onConnect,
}: StripeConnectionCompactBannerProps) {
  return (
    <div className="shadow-card mb-8 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 transition-all hover:shadow-card-hover sm:max-w-[320px]">
      <div className="p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
          <CreditCard className="h-5 w-5 text-neutral-600" />
        </div>

        <h3 className="mb-2 text-base font-bold text-neutral-800">
          Connect Stripe
        </h3>

        <p className="mb-4 text-xs leading-relaxed text-neutral-600">
          Set up secure payment processing to receive earnings from your
          courses. Takes about 5 minutes.
        </p>

        <Button
          variant="brand"
          size="sm"
          fullWidth
          onClick={onConnect}
        >
          Connect Now
        </Button>
      </div>
    </div>
  )
}
