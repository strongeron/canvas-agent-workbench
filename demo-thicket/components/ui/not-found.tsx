import { AlertCircle } from "lucide-react"

export interface NotFoundStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  showIcon?: boolean
  action?: React.ReactNode
  className?: string
}

export function NotFoundState({
  title,
  description,
  icon,
  showIcon = true,
  action,
  className = "",
}: NotFoundStateProps) {
  const defaultIcon = <AlertCircle className="text-muted h-16 w-16" />

  return (
    <div className={`flex flex-col items-center justify-center px-4 py-20 text-center ${className}`}>
      {showIcon && (
        <div className="mb-6 opacity-60">{icon ?? defaultIcon}</div>
      )}
      <h1 className="text-foreground font-display mb-2 text-2xl font-bold">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-md text-base leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

