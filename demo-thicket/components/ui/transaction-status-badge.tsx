import { cn } from "../../lib/utils"

type TransactionStatus = "completed" | "pending" | "processing"

interface TransactionStatusBadgeProps {
  status: TransactionStatus
  size?: "sm" | "md"
}

const statusConfig: Record<
  TransactionStatus,
  { label: string; className: string }
> = {
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
}

export function TransactionStatusBadge({
  status,
  size = "sm",
}: TransactionStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status ?? "Unknown",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}
