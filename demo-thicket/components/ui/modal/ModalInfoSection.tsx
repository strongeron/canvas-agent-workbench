import type { ElementType } from "react"

interface ModalInfoSectionProps {
  /** Icon component to display */
  icon: ElementType
  /** Title text */
  title: string
  /** Description text */
  description: string
  /** Custom icon background color class */
  iconBg?: string
  /** Custom icon color class */
  iconColor?: string
  /** Custom className */
  className?: string
}

/**
 * ModalInfoSection - Icon + text section pattern for modals.
 * 
 * Displays an icon in a circle with title and description text.
 * Commonly used for displaying information sections in modals.
 */
export function ModalInfoSection({
  icon: Icon,
  title,
  description,
  iconBg = "bg-brand-50",
  iconColor = "text-brand-600",
  className = "",
}: ModalInfoSectionProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <h3 className="text-foreground mb-1 text-sm font-semibold">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  )
}

