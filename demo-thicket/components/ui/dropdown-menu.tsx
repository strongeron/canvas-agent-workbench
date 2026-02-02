import { type ReactNode, useState } from "react"

import { cn } from "@thicket/lib/utils"

import { Popover, PopoverContent, PopoverTrigger } from "./popover"

interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: "left" | "right"
  className?: string
}

export function DropdownMenu({
  trigger,
  children,
  align = "right",
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align === "right" ? "end" : "start"}
        className={cn(
          "border-default w-48 rounded-lg border bg-white shadow-lg",
          className,
        )}
      >
        <div
          className="py-1"
          onClick={() => setIsOpen(false)}
          role="menu"
          aria-orientation="vertical"
        >
          {children}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface DropdownMenuItemProps {
  onClick?: () => void
  children: ReactNode
  icon?: ReactNode
  variant?: "default" | "danger"
  disabled?: boolean
}

export function DropdownMenuItem({
  onClick,
  children,
  icon,
  variant = "default",
  disabled = false,
}: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
        variant === "default" &&
          "text-foreground hover:bg-surface-100 disabled:text-muted disabled:cursor-not-allowed",
        variant === "danger" &&
          "text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300",
      )}
      role="menuitem"
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="bg-surface-200 my-1 h-px" />
}
