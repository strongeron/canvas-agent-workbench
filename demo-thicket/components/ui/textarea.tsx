import type { TextareaHTMLAttributes } from "react"
import { forwardRef } from "react"

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  success?: string
  warning?: string
  helperText?: string
  characterCount?: {
    current: number
    max: number
  }
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      success,
      warning,
      helperText,
      characterCount,
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

    const isNearLimit =
      characterCount && characterCount.current / characterCount.max > 0.8
    const isOverLimit =
      characterCount && characterCount.current > characterCount.max

    return (
      <div className="w-full">
        {label && (
          <div className="mb-2 flex items-center justify-between">
            <label className={`block text-sm font-medium ${labelColor}`}>
              {label}
            </label>
            {characterCount && (
              <span
                className={`text-xs font-medium ${
                  isOverLimit
                    ? "text-error"
                    : isNearLimit
                      ? "text-warning"
                      : "text-muted"
                }`}
              >
                {characterCount.current} / {characterCount.max}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          className={`w-full rounded-lg px-4 py-3 text-base ${bgColor} border ${textColor} focus:ring-brand-300 focus:border-brand-300 transition-all duration-200 focus:ring-1 focus:outline-none disabled:cursor-not-allowed ${disabledColor} ${borderClass} ${className}`}
          {...props}
        />
        {helperText && !message && (
          <p className="text-muted mt-2 text-sm">{helperText}</p>
        )}
        {message && <p className={`mt-2 text-sm ${messageColor}`}>{message}</p>}
      </div>
    )
  },
)

Textarea.displayName = "Textarea"
