import { router } from "@thicket/shims/inertia-react"
import { track } from "@plausible-analytics/tracker"
import { Sparkles } from "lucide-react"

import { CoursePreviewCard } from "@thicket/components/course-preview-card"
import { Badge } from "@thicket/components/ui/badge"
import { Button } from "@thicket/components/ui/button"
import type { Course } from "@thicket/types"

export function HeroStackedCards({
  showcaseCourses,
}: {
  showcaseCourses: Course[]
}) {
  const handleJoinEarlyAccess = () => {
    track("hero_join_cta_clicked", {})
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

  const CARD_STACK_CONFIG = {
    numberOfCards: 5,
    baseAngle: 0,
    angleStep: 8,
  }

  const generateCardPositions = () => {
    const { numberOfCards, baseAngle, angleStep } = CARD_STACK_CONFIG
    const positions = []
    const centerIndex = Math.floor(numberOfCards / 2)

    for (let i = 0; i < numberOfCards; i++) {
      const distanceFromCenter = i - centerIndex
      const rotation = baseAngle + distanceFromCenter * angleStep
      const absDistance = Math.abs(distanceFromCenter)

      const translateY = absDistance * 12
      const marginLeft = -20 - i * 2
      const zIndex = 30 - absDistance * 10

      positions.push({
        rotation: `${rotation}deg`,
        translateY: `${translateY}px`,
        marginLeft: `${marginLeft}%`,
        zIndex,
      })
    }

    return positions
  }

  const cardPositions = generateCardPositions()

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

      <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-8 sm:px-5 sm:pt-16 sm:pb-10 md:px-6 lg:px-8">
        <div className="mdlg:grid mdlg:grid-cols-2 mdlg:items-center flex flex-col gap-12 sm:gap-16 md:gap-12 lg:gap-16">
          <div className="mdlg:order-1 mdlg:space-y-3 mdlg:text-left order-2 mb-2 space-y-2 text-center">
            <div className="mdlg:justify-start flex justify-center">
              <Badge variant="brand" size="md" icon={Sparkles}>
                Launching soon
              </Badge>
            </div>
            <h1 className="font-display text-brand-500 mdlg:text-3xl text-2xl leading-tight font-bold text-balance sm:text-3xl md:text-4xl lg:text-5xl">
              Join live seminars with top experts
            </h1>
            <p className="text-brand-500 mdlg:text-base pb-3 text-base leading-normal text-pretty sm:text-lg lg:text-xl">
              Online classes in history, literature, art, and more, taught by
              experts from top universities.
            </p>
            <div className="mdlg:justify-start flex justify-center pt-0.5">
              <Button
                onClick={handleJoinEarlyAccess}
                size="lg"
                rounded="full"
                className="bg-brand-500 hover:bg-brand-600 w-full text-white shadow-xl hover:shadow-2xl sm:w-auto"
              >
                Join early access
              </Button>
            </div>
          </div>

          <div className="mdlg:order-2 mdlg:mb-0 order-1 -mx-4 mb-6 sm:-mx-2 sm:mb-8 md:mx-0">
            <div className="mdlg:h-[320px] mdlg:items-center mdlg:pt-0 relative flex h-[300px] items-start justify-center pt-2 sm:h-[320px] sm:pt-3 md:h-[340px] lg:h-[360px]">
              {showcaseCourses
                .slice(0, CARD_STACK_CONFIG.numberOfCards)
                .map((course, index) => {
                  if (!course) return null

                  const config = cardPositions[index]

                  return (
                    <div
                      key={course.id}
                      className="mdlg:w-[62%] absolute w-[44%] transition-transform duration-300 hover:z-40 sm:w-[42%] md:w-[40%] lg:w-[42%]"
                      style={{
                        zIndex: config.zIndex,
                        transform: `translateY(${config.translateY}) rotate(${config.rotation})`,
                        left: "50%",
                        marginLeft: config.marginLeft,
                      }}
                    >
                      <CoursePreviewCard
                        course={course}
                        instructor={course.instructor}
                      />
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
