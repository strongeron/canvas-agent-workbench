import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react"
import type { ElementType, ReactNode } from "react"

type WarningVariant = "info" | "warning" | "error" | "success"

interface ModalWarningProps {
  children: ReactNode
  variant?: WarningVariant
  icon?: ElementType
  title?: string
  className?: string
}

const variantConfig = {
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    iconColor: "text-blue-600",
    titleColor: "text-blue-900",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-800",
    iconColor: "text-amber-600",
    titleColor: "text-amber-900",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-800",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-800",
    iconColor: "text-green-600",
    titleColor: "text-green-900",
  },
}

export function ModalWarning({
  children,
  variant = "info",
  icon,
  title,
  className = "",
}: ModalWarningProps) {
  const config = variantConfig[variant]
  const Icon = icon || config.icon

  return (
    <div
      className={`flex gap-3 rounded-lg border p-4 ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
      <div className="flex-1">
        {title && (
          <p className={`mb-1 text-sm font-semibold ${config.titleColor}`}>
            {title}
          </p>
        )}
        <div className={`text-sm ${config.textColor}`}>{children}</div>
      </div>
    </div>
  )
}
