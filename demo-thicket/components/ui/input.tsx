import type { InputHTMLAttributes } from "react"
import { forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  warning?: string
  hideLabel?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      warning,
      hideLabel = false,
      className = "",
      ...props
    },
    ref,
  ) => {
    const hasError = !!error
    const hasSuccess = !!success && !error
    const hasWarning = !!warning && !error && !success

    const borderClass = hasError
      ? "border-error"
      : hasSuccess
        ? "border-success"
        : hasWarning
          ? "border-warning"
          : "border-default hover:border-strong"

    const message = error ?? success ?? warning
    const messageColor = hasError
      ? "text-error"
      : hasSuccess
        ? "text-success"
        : "text-warning"

    const labelColor = "text-muted-foreground"
    const bgColor = "bg-white"
    const textColor = "text-foreground placeholder:text-muted"
    const disabledColor = "disabled:bg-surface-100 disabled:text-disabled"

    return (
      <div className="w-full">
        {label && (
          <label
            className={`${hideLabel ? "sr-only" : `mb-2 block text-sm font-medium ${labelColor}`}`}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`h-11 w-full rounded-lg px-4 py-3 text-base ${bgColor} border ${textColor} focus:ring-brand-300 focus:border-brand-300 transition-all duration-200 focus:ring-1 focus:outline-none disabled:cursor-not-allowed ${disabledColor} ${borderClass} ${className}`}
          {...props}
        />
        {message && <p className={`mt-2 text-sm ${messageColor}`}>{message}</p>}
      </div>
    )
  },
)

Input.displayName = "Input"
