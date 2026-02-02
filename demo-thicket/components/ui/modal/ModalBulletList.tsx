import type { ElementType } from "react"

interface ModalBulletListProps {
  items: string[]
  icon?: ElementType
  iconClassName?: string
  /** Bullet color class - can be bg-* for rounded-full or text-* for text color */
  bulletColor?: string
  className?: string
}

export function ModalBulletList({
  items,
  icon: Icon,
  iconClassName = "h-4 w-4",
  bulletColor = "bg-brand-500",
  className = "",
}: ModalBulletListProps) {
  // Check if bulletColor is a text color (starts with "text-") or bg color
  const isTextColor = bulletColor.startsWith("text-")
  
  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <li key={index} className="text-muted-foreground flex items-start gap-2 text-sm">
          {Icon ? (
            <Icon className={`mt-0.5 shrink-0 ${iconClassName}`} />
          ) : isTextColor ? (
            <span className={`${bulletColor} mt-1`}>•</span>
          ) : (
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletColor}`}
            />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
