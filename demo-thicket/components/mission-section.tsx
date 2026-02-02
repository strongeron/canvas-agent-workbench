import { router } from "../shims/inertia-react"

import { Button } from "./ui/button"
import { LogoMasked } from "./ui/logo-masked"

export function MissionSection() {
  const handleJoinEarlyAccess = () => {
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        show_early_access: true,
      }),
      preserveScroll: true,
      preserveState: true,
    })
  }

  return (
    <div>
      <section className="bg-white py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="bg-surface-200 border-subtle aspect-4/3 overflow-hidden rounded-2xl border shadow-lg">
                <img
                  src="https://images.pexels.com/photos/5212317/pexels-photo-5212317.jpeg"
                  alt="Group of people learning together"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="bg-brand-100 absolute -bottom-6 -right-6 -z-10 h-48 w-48 rounded-2xl" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-display text-foreground mb-6 text-3xl font-bold md:text-4xl">
                We want to make education accessible, social, and fun
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Thicket is a place for anyone who wants to learn for fun. We invite scholars to create live online courses on the subjects they care about most—open to adult students from every background. No pressure or grades, just great discussions with curious learners.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Want to read your favorite author with an expert and fellow enthusiasts? Examine legal cases from the ancient world? Discuss Buddhist art? Check out our courses or suggest one you&apos;d love to see.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-50 py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="order-1">
              <h2 className="font-display text-foreground mb-6 text-3xl font-bold md:text-4xl">
                Our online classes are live and in small groups
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                We think learning requires live discussion, not just pre-recorded content. Classes meet once per week online, and have only 15 students max.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This means plenty of time to ask questions and discuss your thoughts with the instructor and fellow learners.
              </p>
            </div>
            <div className="relative order-2">
              <div className="bg-surface-200 border-subtle aspect-4/3 overflow-hidden rounded-2xl border shadow-lg">
                <img
                  src="https://images.pexels.com/photos/4226140/pexels-photo-4226140.jpeg"
                  alt="Person participating in online video class with small group"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="bg-brand-100 absolute -bottom-6 -right-6 -z-10 h-48 w-48 rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="bg-surface-200 border-subtle aspect-4/3 overflow-hidden rounded-2xl border shadow-lg">
                <img
                  src="https://images.pexels.com/photos/6774432/pexels-photo-6774432.jpeg"
                  alt="Diverse team of academics and developers collaborating"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="bg-brand-100 absolute -bottom-6 -right-6 -z-10 h-48 w-48 rounded-2xl" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-display text-foreground mb-6 text-3xl font-bold md:text-4xl">
                We are a small team of academics, developers, and learning enthusiasts
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Thicket was created by people who love to learn and teach. Many of us have taught and researched in universities. All of us are passionate about providing amazing educational experiences.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Want to work with us? <a href="#openings" className="text-brand-600 hover:text-brand-700 underline font-medium">See our current openings</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 py-20 md:py-28 lg:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <LogoMasked
            variant="icon"
            className="absolute -top-20 -left-20 h-[20rem] w-[20rem] -rotate-[20deg] text-white opacity-[0.05] md:-top-32 md:-left-32 md:h-[28rem] md:w-[28rem] lg:h-[40rem] lg:w-[40rem]"
            style={{
              filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.15)) drop-shadow(0 0 2px rgba(255,255,255,0.1))'
            }}
          />
          <LogoMasked
            variant="icon"
            className="absolute -bottom-20 -right-20 h-[20rem] w-[20rem] rotate-[20deg] text-white opacity-[0.05] md:-bottom-32 md:-right-32 md:h-[28rem] md:w-[28rem] lg:h-[40rem] lg:w-[40rem]"
            style={{
              filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.15)) drop-shadow(0 0 2px rgba(255,255,255,0.1))'
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display mb-6 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            We are launching soon
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-brand-50 md:text-xl">
            We&apos;re putting the final touches on our learning platform, and plan to
            open enrollment for classes soon. Sign up to hear when we launch.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleJoinEarlyAccess}
              variant="waitlist"
              size="lg"
              rounded="full"
              fullWidth={false}
              className="shadow-xl hover:shadow-2xl"
            >
              Join Early Access
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
