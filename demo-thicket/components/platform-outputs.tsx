import { router } from "@inertiajs/react"
import { track } from "@plausible-analytics/tracker"
import { Layout, PlayCircle, Users, Video } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@thicket/components/ui/button"

interface PlatformFeature {
  icon: LucideIcon
  title: string
  description: string
}

const features: PlatformFeature[] = [
  {
    icon: Video,
    title: "Live interactive sessions",
    description: "Engage in real-time discussions with expert instructors",
  },
  {
    icon: Users,
    title: "Small discussion groups",
    description: "Maximum 15 students for personalized attention",
  },
  {
    icon: PlayCircle,
    title: "Session recordings",
    description: "Review and revisit class content anytime",
  },
  {
    icon: Layout,
    title: "Dedicated platform",
    description: "Track progress and organize your schedule",
  },
]

interface PlatformOutputsProps {
  variant?: "full" | "minimal" | "details" | "cards-only" | "minimalistic-b"
  /** Section title. Pass `null` to hide title, `undefined` for default ("What You Get") */
  title?: string | null
  showCta?: boolean
}

export function PlatformOutputs({ variant = "full", title, showCta = false }: PlatformOutputsProps) {
  const defaultTitle = "What You Get"
  const showTitle = title !== null
  const displayTitle = title ?? defaultTitle
  const handleJoinEarlyAccess = () => {
    track("platform_features_join_cta_clicked", {})
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        show_early_access: true,
        selected_course: undefined,
      }),
      preserveScroll: true,
      preserveState: true,
    })
  }
  if (variant === "minimal") {
    return (
      <div className="space-y-3">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div key={index} className="group flex items-start gap-3 transition-all duration-300">
              <div className="shrink-0">
                <Icon className="text-brand-500 group-hover:text-brand-600 h-5 w-5 transition-colors duration-300" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-display font-semibold leading-snug bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent group-hover:from-brand-700 group-hover:to-brand-800 transition-all duration-300">
                  {feature.title}
                </h4>
                <p className="text-muted group-hover:text-muted-foreground text-xs leading-relaxed transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (variant === "details") {
    return (
      <section>
        {showTitle && (
          <h2 className="text-foreground font-display mb-6 text-2xl font-bold">
            {displayTitle}
          </h2>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="group relative overflow-hidden bg-white border-default shadow-card rounded-xl border p-6 transition-all duration-300 hover:shadow-lg hover:border-brand-300"
              >
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-brand-200/20 via-brand-100/10 to-brand-50/5 transition-opacity duration-500" />
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-brand-300/40 via-brand-200/30 to-brand-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 group-hover:bg-brand-200 transition-colors duration-300">
                    <Icon className="text-brand-600 group-hover:text-brand-700 h-5 w-5 transition-colors duration-300" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2 bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent group-hover:from-brand-700 group-hover:to-brand-800 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground group-hover:text-gray-700 text-sm leading-relaxed transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  if (variant === "minimalistic-b") {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg border border-default bg-white p-4 shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-300"
            >
              <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-brand-200/15 via-brand-100/10 to-brand-50/5 transition-opacity duration-500" />
              <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-brand-300/40 via-brand-200/30 to-brand-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 group-hover:bg-brand-200 transition-colors duration-300">
                  <Icon className="text-brand-600 group-hover:text-brand-700 h-5 w-5 transition-colors duration-300" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-display font-semibold mb-1 bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent group-hover:from-brand-700 group-hover:to-brand-800 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted group-hover:text-muted-foreground text-xs transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (variant === "cards-only") {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-brand-300 bg-white p-6 shadow-sm hover:shadow-lg hover:shadow-brand-200/30 transition-all duration-300"
            >
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-brand-200/25 via-brand-100/15 to-brand-50/5 transition-opacity duration-500" />
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-brand-300/60 via-brand-200/40 to-brand-100/25 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 group-hover:bg-brand-200 transition-colors duration-300">
                  <Icon className="text-brand-600 group-hover:text-brand-700 h-6 w-6 transition-colors duration-300" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2 bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent group-hover:from-brand-700 group-hover:to-brand-800 transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground group-hover:text-gray-700 text-sm leading-relaxed transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section className="bg-surface-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showTitle && (
          <div className="mb-10 text-center">
            <h2 className="font-display text-foreground mb-3 text-3xl font-bold md:text-4xl">
              {displayTitle}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
              A complete learning experience designed for engaged, interactive education
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-brand-300 bg-white p-6 shadow-sm hover:shadow-lg hover:shadow-brand-200/30 transition-all duration-300"
              >
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-brand-200/25 via-brand-100/15 to-brand-50/5 transition-opacity duration-500" />
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-brand-300/60 via-brand-200/40 to-brand-100/25 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 group-hover:bg-brand-200 transition-colors duration-300">
                    <Icon className="text-brand-600 group-hover:text-brand-700 h-6 w-6 transition-colors duration-300" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2 bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent group-hover:from-brand-700 group-hover:to-brand-800 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground group-hover:text-gray-700 text-sm leading-relaxed transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {showCta && (
          <div className="mt-10 flex justify-center">
            <Button
              onClick={handleJoinEarlyAccess}
              size="lg"
              rounded="full"
              className="bg-brand-500 hover:bg-brand-600 w-full text-white shadow-xl hover:shadow-2xl sm:w-auto"
            >
              Join early access
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
