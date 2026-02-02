export function HowThicketWorks() {
  return (
    <section className="bg-white py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-foreground mb-16 text-center text-3xl font-bold md:text-4xl">
          How Thicket Works
        </h2>

        <div className="space-y-20">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 lg:order-1">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-600">
                <span className="font-display text-2xl font-bold text-white">
                  1
                </span>
              </div>
              <h3 className="font-display text-foreground mb-4 text-2xl font-bold">
                Design your seminar
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Craft a compelling seminar, using our simple course builder. You
                decide meeting times, course length, weekly topics, readings, and
                assignments.
              </p>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-surface-100 aspect-video overflow-hidden rounded-xl border border-default shadow-lg">
                <img
                  src="https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg"
                  alt="Teacher working on laptop planning course curriculum"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-1">
              <div className="bg-surface-100 aspect-video overflow-hidden rounded-xl border border-default shadow-lg">
                <img
                  src="https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg"
                  alt="Person teaching an online class from their laptop"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="order-2">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-600">
                <span className="font-display text-2xl font-bold text-white">
                  2
                </span>
              </div>
              <h3 className="font-display text-foreground mb-4 text-2xl font-bold">
                Teach live lessons
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Lead engaging weekly sessions with up to 15 students. In between
                sessions, you can message students, post announcements, and upload
                materials.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 lg:order-1">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-600">
                <span className="font-display text-2xl font-bold text-white">
                  3
                </span>
              </div>
              <h3 className="font-display text-foreground mb-4 text-2xl font-bold">
                Earn and grow
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Set your own course fees and get paid at the end of each seminar.
                Build your reputation, connect with students, and teach what you&apos;re
                passionate about.
              </p>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-surface-100 aspect-video overflow-hidden rounded-xl border border-default shadow-lg">
                <img
                  src="https://images.pexels.com/photos/669610/pexels-photo-669610.jpeg"
                  alt="Professional growth and success in teaching"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
