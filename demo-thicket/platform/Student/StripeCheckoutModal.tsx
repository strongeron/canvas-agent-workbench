import { CreditCard, Lock } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import { Input } from "@thicket/components/ui/input"
import { Modal } from "@thicket/components/ui/modal/"
import { useStripeCheckout } from "@thicket/platform/hooks/useStripeCheckout"
import type { AuthorProfile, Course } from "@thicket/types"

export interface StripeCheckoutModalProps {
  course: Course & { instructor?: AuthorProfile }
  onClose: () => void
  studentId: number
}

export function StripeCheckoutModal({
  course,
  onClose,
  studentId,
}: StripeCheckoutModalProps) {
  const {
    cardNumber,
    expiry,
    cvc,
    cardholderName,
    isProcessing,
    setCardholderName,
    handleCardNumberChange,
    handleExpiryChange,
    handleCvcChange,
    handleSubmit,
  } = useStripeCheckout({
    courseId: course.id,
    studentId,
    onSuccess: onClose,
  })

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit()
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      closeOnOverlayClick={!isProcessing}
      closeOnEscape={!isProcessing}
      aria-labelledby="stripe-checkout-title"
      aria-describedby="stripe-checkout-description"
    >
      <Modal.Header
        id="stripe-checkout-title"
        onClose={onClose}
        hideCloseButton={isProcessing}
      >
        Complete Your Enrollment
      </Modal.Header>

      <Modal.Body id="stripe-checkout-description">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-blue-600">
            <Lock className="h-5 w-5" />
            <span className="text-sm font-medium">Secure Payment</span>
          </div>

          <p className="text-muted-foreground text-sm">
            You&apos;re enrolling in {course.title}
            {course.instructor && ` with ${course.instructor.name}`}
          </p>

          <div className="rounded-xl border border-default bg-surface-50 p-6">
            <div className="flex items-start gap-4">
              {course.cover_url && (
                <img
                  src={course.cover_url}
                  alt={course.title}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="text-foreground font-semibold">{course.title}</h3>
                {course.instructor && (
                  <p className="text-muted-foreground text-sm">
                    by {course.instructor.name}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-foreground text-2xl font-bold">
                  ${course.price}
                </div>
                <div className="text-muted-foreground text-xs">USD</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                Card Number
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  className="pl-10"
                  disabled={isProcessing}
                  required
                />
                <CreditCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Expiry Date
                </label>
                <Input
                  type="text"
                  value={expiry}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  placeholder="MM/YY"
                  disabled={isProcessing}
                  required
                />
              </div>
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  CVC
                </label>
                <Input
                  type="text"
                  value={cvc}
                  onChange={(e) => handleCvcChange(e.target.value)}
                  placeholder="123"
                  disabled={isProcessing}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                Cardholder Name
              </label>
              <Input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                disabled={isProcessing}
                required
              />
            </div>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing Payment...
                </div>
              ) : (
                `Pay $${course.price}`
              )}
            </Button>

            <p className="text-muted-foreground text-center text-xs">
              Your payment is secured by Stripe. By completing this purchase,
              you agree to the course terms.
            </p>
          </form>
        </div>
      </Modal.Body>
    </Modal>
  )
}
