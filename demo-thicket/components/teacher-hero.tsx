import { Link, router } from "@inertiajs/react"
import { ArrowRight } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import { LogoMasked } from "@thicket/components/ui/logo-masked"
import { contacts_path, teacher_application_path } from "@thicket/routes"

export function TeacherHero() {
  const handleApplyToTeach = () => {
    router.visit(teacher_application_path())
  }

  return (
    <div className="relative overflow-hidden bg-linear-to-br from-surface-50 via-brand-50 to-brand-100">
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

      {/* Decorative Logo Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <LogoMasked
          variant="icon"
          className="absolute -top-20 -left-20 h-80 w-80 text-white opacity-10 md:-top-32 md:-left-32 md:h-96 md:w-96 lg:h-120 lg:w-120"
          style={{
            filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.15)) drop-shadow(0 0 2px rgba(255,255,255,0.1))'
          }}
        />
        <LogoMasked
          variant="icon"
          className="absolute -bottom-20 -right-20 h-80 w-80 rotate-180 text-white opacity-10 md:-bottom-32 md:-right-32 md:h-96 md:w-96 lg:h-120 lg:w-120"
          style={{
            filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.15)) drop-shadow(0 0 2px rgba(255,255,255,0.1))'
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-10 text-center sm:px-6 sm:pt-28 sm:pb-14 md:pt-32 md:pb-16 lg:px-8 lg:pt-36 lg:pb-20">
        <h1 className="font-display text-brand-500 mb-4 text-2xl font-bold leading-tight text-balance sm:text-3xl md:text-4xl lg:text-5xl">
          Teach what you love
        </h1>
        <p className="text-brand-500 mx-auto mb-6 max-w-xl text-sm leading-relaxed text-pretty sm:max-w-2xl sm:text-base md:text-lg lg:text-xl">
          Design and teach live online humanities seminars, based on your own
          interests and expertise. You set your own schedule and course fees.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            onClick={handleApplyToTeach}
            size="lg"
            rounded="full"
            className="bg-brand-600 hover:bg-brand-700 w-full text-white shadow-xl hover:shadow-2xl sm:w-auto"
          >
            Apply to teach
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        <p className="text-brand-600 mt-6 text-sm">
          Questions?{" "}
          <Link
            href={contacts_path()}
            className="hover:text-brand-700 font-medium underline underline-offset-2"
          >
            We&apos;d love to hear from you.
          </Link>
        </p>
      </div>
    </div>
  )
}
