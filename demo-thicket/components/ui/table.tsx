import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "../../lib/utils"

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  )
}

export function TableHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-default bg-surface-50 text-muted-foreground border-b text-sm font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  )
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />
}

export function TableRow({
  children,
  className,
  onClick,
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-default hover:bg-surface-50 border-b transition-colors",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableHead({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("text-foreground px-4 py-4 text-sm", className)} {...props}>
      {children}
    </td>
  )
}
