export interface TypographyHeroProps {
  eyebrow?: string
  headline?: string
  subheadline?: string
  ctaPrimary?: string
  ctaSecondary?: string
  align?: "left" | "center"
  displayFont?: string
  bodyFont?: string
}

function withFallbackFont(value: string | undefined, fallbackVar: string) {
  const trimmed = value?.trim()
  if (trimmed) return trimmed
  return `var(${fallbackVar}, "Inter", system-ui, sans-serif)`
}

export function TypographyHero({
  eyebrow = "Typography exploration",
  headline = "Ship a hero that looks intentional, not generic.",
  subheadline = "Test headline rhythm, body readability, and CTA hierarchy side by side on one canvas.",
  ctaPrimary = "Run comparison",
  ctaSecondary = "Open style guide",
  align = "left",
  displayFont,
  bodyFont,
}: TypographyHeroProps) {
  const isCentered = align === "center"
  const textAlignClass = isCentered ? "items-center text-center" : "items-start text-left"

  return (
    <section className="h-full w-full rounded-2xl border border-default bg-gradient-to-br from-white to-surface-50 p-8">
      <div className={`flex h-full flex-col justify-between gap-7 ${textAlignClass}`}>
        <div className="space-y-4">
          <div
            className="inline-flex rounded-full border border-default bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            style={{ fontFamily: withFallbackFont(bodyFont, "--font-family-sans") }}
          >
            {eyebrow}
          </div>

          <h1
            className="max-w-3xl text-4xl font-semibold leading-tight text-foreground md:text-5xl"
            style={{ fontFamily: withFallbackFont(displayFont, "--font-family-display") }}
          >
            {headline}
          </h1>

          <p
            className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
            style={{ fontFamily: withFallbackFont(bodyFont, "--font-family-sans") }}
          >
            {subheadline}
          </p>
        </div>

        <div className={`flex flex-wrap gap-3 ${isCentered ? "justify-center" : "justify-start"}`}>
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            style={{ fontFamily: withFallbackFont(bodyFont, "--font-family-sans") }}
          >
            {ctaPrimary}
          </button>
          <button
            type="button"
            className="rounded-lg border border-default bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-100"
            style={{ fontFamily: withFallbackFont(bodyFont, "--font-family-sans") }}
          >
            {ctaSecondary}
          </button>
        </div>
      </div>
    </section>
  )
}
