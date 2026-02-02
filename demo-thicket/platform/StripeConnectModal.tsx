import { router } from "@thicket/shims/inertia-react"
import { CheckCircle2, CreditCard } from "lucide-react"
import { useState } from "react"

import { Button } from "@thicket/components/ui/button"
import { Modal } from "@thicket/components/ui/modal/"

interface StripeConnectModalProps {
  isOpen: boolean
  onClose: () => void
  instructorId: number
}

export function StripeConnectModal({
  isOpen,
  onClose,
  instructorId,
}: StripeConnectModalProps) {
  const [connecting, setConnecting] = useState(false)

  const handleConnect = () => {
    setConnecting(true)

    setTimeout(() => {
      router.post(
        "/teacher/stripe/connect",
        { instructor_id: instructorId },
        {
          onSuccess: () => {
            onClose()
          },
          onFinish: () => {
            setConnecting(false)
          },
        }
      )
    }, 800)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      aria-labelledby="stripe-connect-title"
      aria-describedby="stripe-connect-description"
    >
      <Modal.Header
        id="stripe-connect-title"
        onClose={onClose}
        subtitle="Set up secure payment processing to receive earnings from your courses"
      >
        Connect Stripe
      </Modal.Header>
      <Modal.Body id="stripe-connect-description">
        <div className="space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
            <CreditCard className="h-6 w-6 text-emerald-600" />
          </div>

          <div>
            <h3 className="text-brand-900 mb-2 text-lg font-bold">
              Stripe Connect
            </h3>
            <p className="text-brand-800 text-sm leading-relaxed">
              Industry-standard payment processing trusted by millions of
              businesses worldwide. Automatic transfers, professional invoicing,
              and complete transaction history.
            </p>
          </div>

          <Modal.BulletList
            items={[
              "Secure payment processing for your courses",
              "Automatic transfers to your bank account",
              "Professional invoicing and receipts",
              "Full transaction history and reporting",
            ]}
            icon={CheckCircle2}
            iconClassName="h-5 w-5 text-emerald-600"
            className="text-brand-800"
          />
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="brand"
          size="md"
          fullWidth
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? "Connecting..." : "Connect with Stripe"}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
