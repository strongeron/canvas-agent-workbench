import { X } from "lucide-react"
import type { ElementType, ReactNode } from "react"

export interface ModalHeaderProps {
  /** Title text - preferred over children for consistency */
  title?: string
  /** @deprecated Use `title` prop instead. Children still supported for backwards compatibility */
  children?: ReactNode
  onClose?: () => void
  icon?: ElementType
  iconClassName?: string
  subtitle?: string
  hideCloseButton?: boolean
  id?: string
}

export function ModalHeader({
  title,
  children,
  onClose,
  icon: Icon,
  iconClassName = "h-5 w-5 text-brand-600",
  subtitle,
  hideCloseButton = false,
  id,
}: ModalHeaderProps) {
  const headerContent = title ?? children

  return (
    <div className="border-default flex items-center justify-between border-b pt-6 pb-6">
      <div className="flex flex-1 items-start gap-3 pr-4">
        {Icon && (
          <div className="bg-brand-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Icon className={iconClassName} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2
            id={id}
            className="text-foreground font-display text-xl font-bold"
          >
            {headerContent}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      {!hideCloseButton && onClose && (
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-surface-200 shrink-0 cursor-pointer rounded-lg p-2 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}
