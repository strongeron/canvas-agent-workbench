export function AboutHero() {
  return (
    <div className="from-surface-50 via-brand-50 to-brand-100 relative overflow-hidden bg-linear-to-br">
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

      <div className="relative mx-auto max-w-4xl px-4 pt-32 pb-20 text-center sm:px-6 md:pt-40 md:pb-24 lg:px-8 lg:pt-44 lg:pb-24">
        <h1 className="font-display text-brand-500 mb-3 text-4xl font-bold leading-tight sm:text-5xl md:text-5xl">
          Welcome to Thicket
        </h1>
        <p className="text-brand-600 text-xl leading-relaxed sm:text-2xl">
          We believe in learning for the love of it.
        </p>
      </div>
    </div>
  )
}
