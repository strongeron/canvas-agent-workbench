import { router } from "@thicket/shims/inertia-react"
import { ArrowRight, BookOpen, Clock, DollarSign, Heart, MessageSquare, Users } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import { teacher_application_path } from "@thicket/routes"

export function WhyTeachSection() {
  const handleApplyToTeach = () => {
    router.visit(teacher_application_path())
  }

  const benefits = [
    {
      icon: Heart,
      title: "Teach What You Love",
      description:
        "Design seminars around your passions and expertise. Share what excites you most with curious learners.",
    },
    {
      icon: DollarSign,
      title: "Control What You Earn",
      description:
        "Set your own course fees. We'll handle payments and distribute earnings at the end of each course.",
    },
    {
      icon: Clock,
      title: "Choose Your Own Schedule",
      description:
        "Choose when you teach. Seminars run 1-8 weeks with one session per week.",
    },
    {
      icon: Users,
      title: "Meet Engaged Students",
      description:
        "Teach motivated adult learners who are excited about your subject matter.",
    },
    {
      icon: BookOpen,
      title: "Receive Full Support",
      description:
        "We help with marketing, enrollment, and technical support so you can focus on teaching.",
    },
    {
      icon: MessageSquare,
      title: "Collaborate with Fellow Teachers",
      description:
        "Join a supportive community of educators. Share ideas, resources, and insights with other teachers.",
    },
  ]

  return (
    <section className="bg-surface-50 py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="font-display text-foreground mb-4 text-3xl font-bold md:text-4xl">
            Why teach with Thicket?
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Join a community of educators who love to teach
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl border border-gray-200 hover:border-brand-300 bg-white p-6 shadow-sm hover:shadow-lg hover:shadow-brand-200/30 transition-all duration-300"
              >
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-brand-200/25 via-brand-100/15 to-brand-50/5 transition-opacity duration-500" />
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-brand-300/60 via-brand-200/40 to-brand-100/25 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 group-hover:bg-brand-200 transition-colors duration-300">
                    <Icon className="text-brand-600 group-hover:text-brand-700 h-6 w-6 transition-colors duration-300" />
                  </div>
                  <h3 className="font-display text-foreground group-hover:text-brand-700 mb-3 text-xl font-semibold transition-colors duration-300">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground group-hover:text-gray-700 leading-relaxed transition-colors duration-300">
                    {benefit.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-6 text-lg">
            Ready to share your expertise?
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleApplyToTeach}
              size="lg"
              rounded="full"
              fullWidth={false}
              className="bg-brand-600 hover:bg-brand-700 text-white shadow-xl hover:shadow-2xl"
            >
              Apply to teach
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
