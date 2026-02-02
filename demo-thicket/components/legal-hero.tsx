interface LegalHeroProps {
  title: string
  lastUpdated?: string
}

export function LegalHero({ title, lastUpdated }: LegalHeroProps) {
  return (
    <section className="from-surface-50 via-brand-50 to-brand-100 border-default relative overflow-hidden border-b bg-linear-to-br">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(95, 186, 137, 0) 0%, #5FBA89 200%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(0, 118, 106, 0.10), transparent 90%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-32 lg:px-8 lg:pb-20 lg:pt-40">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-brand-500 text-3xl font-bold sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {lastUpdated && (
            <p className="text-muted-foreground mt-6 text-sm sm:mt-8">{lastUpdated}</p>
          )}
        </div>
      </div>
    </section>
  )
}
