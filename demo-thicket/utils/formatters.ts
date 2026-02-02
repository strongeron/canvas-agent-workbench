export function formatDuration(value?: number) {
  if (value === undefined || value === null) return "—"
  if (value < 1) return `${Math.round(value * 60)} min`
  return value === 1 ? "1 hour" : `${value} hours`
}

export function formatScheduleTime(value?: string) {
  if (!value) return "TBD"
  const date = new Date(value)
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatCurrency(value?: number) {
  if (value === undefined || value === null) return "—"
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

