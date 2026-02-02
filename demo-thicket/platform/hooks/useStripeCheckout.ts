import { useState } from "react"

export function useStripeCheckout({
  onSuccess,
}: {
  courseId: number
  studentId: number
  onSuccess?: () => void
}) {
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [cardholderName, setCardholderName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCardNumberChange = (value: string) => setCardNumber(value)
  const handleExpiryChange = (value: string) => setExpiry(value)
  const handleCvcChange = (value: string) => setCvc(value)

  const handleSubmit = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      onSuccess?.()
    }, 900)
  }

  return {
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
  }
}

