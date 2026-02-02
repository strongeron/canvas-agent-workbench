interface StatsCardProps {
  label: string
  value: number | string
  subtitle?: string
}

export function StatsCard({ label, value, subtitle }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-default bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-muted-foreground mb-2 text-sm font-medium">{label}</p>
      <p className="font-display text-foreground text-3xl font-bold">
        {value}
      </p>
      {subtitle && <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>}
    </div>
  )
}
