import { Link, router } from "@thicket/shims/inertia-react"
import { CheckCircle2, GraduationCap, Settings } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@thicket/components/ui/button"
import {
  areAllStepsCompleted,
  getOnboardingState,
  markStepCompleted,
} from "@thicket/platform/utils/onboardingState"

import { StripeConnectCard } from "./StripeConnectCard"
import { StripeConnectModal } from "./StripeConnectModal"

interface NewbieEmptyStateProps {
  teacherName: string
  teacherId: number
  stripeConnected?: boolean
  profileCompleted?: boolean
  hasCourses?: boolean
  onAllCompleted?: () => void
  basePath?: string
}

export function NewbieEmptyState({
  teacherName,
  teacherId,
  stripeConnected = false,
  profileCompleted = false,
  hasCourses = false,
  onAllCompleted,
  basePath = "/teacher",
}: NewbieEmptyStateProps) {
  const [showStripeModal, setShowStripeModal] = useState(false)
  const [localState, setLocalState] = useState(getOnboardingState())

  useEffect(() => {
    const currentState = getOnboardingState()
    let updatedState = currentState
    let stateChanged = false

    if (stripeConnected && !currentState.stripe_connected) {
      markStepCompleted('stripe_connected')
      updatedState = getOnboardingState()
      stateChanged = true
    }

    if (profileCompleted && !currentState.profile_completed) {
      markStepCompleted('profile_completed')
      updatedState = getOnboardingState()
      stateChanged = true
    }

    if (hasCourses && !currentState.course_created) {
      markStepCompleted('course_created')
      updatedState = getOnboardingState()
      stateChanged = true
    }

    if (stateChanged) {
      // Sync onboarding progress from localStorage into local state once per run.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalState(updatedState)
    }

    if (
      stripeConnected &&
      profileCompleted &&
      hasCourses &&
      !currentState.all_completed_dismissed
    ) {
      if (areAllStepsCompleted()) {
        onAllCompleted?.()
      }
    }
  }, [stripeConnected, profileCompleted, hasCourses, onAllCompleted])

  useEffect(() => {
    const handleRouteChange = () => {
      setLocalState(getOnboardingState())
    }

    router.on('success', handleRouteChange)

    return () => {
      const off = (router as { off?: (event: string, callback: () => void) => void }).off
      if (off) {
        off("success", handleRouteChange)
      }
    }
  }, [])

  const isStripeCompleted = stripeConnected || localState.stripe_connected
  const isProfileCompleted = profileCompleted || localState.profile_completed
  const isCourseCompleted = hasCourses || localState.course_created

  return (
    <div className="px-4 py-8">
      <div className="w-full max-w-5xl">
        <div className="mb-6 text-center">
          <h2 className="font-display text-foreground text-lg font-semibold">
            Start Your Teaching Journey
          </h2>
          <p className="text-muted-foreground text-sm">Welcome, {teacherName}.</p>
        </div>

        <div className="mb-6">
          <div className="grid gap-6 md:grid-cols-3">
            <StripeConnectCard
              isCompleted={isStripeCompleted}
              onConnect={() => setShowStripeModal(true)}
            />

            <div
              className={`shadow-card group relative overflow-hidden rounded-xl border transition-all ${
                isProfileCompleted
                  ? "border-brand-300 bg-brand-50"
                  : "border-neutral-200 bg-neutral-50 hover:shadow-card-hover"
              }`}
            >
              <div className="p-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
                  isProfileCompleted ? "bg-brand-100" : "bg-neutral-100"
                }`}>
                  <Settings className={`h-6 w-6 ${
                    isProfileCompleted ? "text-brand-700" : "text-neutral-600"
                  }`} />
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isProfileCompleted ? "bg-brand-200" : "bg-neutral-200"
                  }`}>
                    <span className={`text-sm font-bold ${
                      isProfileCompleted ? "text-brand-900" : "text-neutral-700"
                    }`}>2</span>
                  </div>
                  <h4 className={`text-lg font-bold ${
                    isProfileCompleted ? "text-brand-900" : "text-neutral-800"
                  }`}>
                    Complete Profile
                  </h4>
                </div>

                <p className={`mb-4 text-sm leading-relaxed ${
                  isProfileCompleted ? "text-brand-800" : "text-neutral-600"
                }`}>
                  Add your bio, photo, and teaching preferences to help students
                  get to know you.
                </p>

                {isProfileCompleted ? (
                  <div className="flex items-center gap-2 rounded-lg bg-brand-100 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-700" />
                    <span className="text-brand-900 text-sm font-medium">
                      Completed
                    </span>
                  </div>
                ) : (
                  <Link href={`${basePath}/profile/edit`}>
                    <Button
                      variant="brand"
                      size="sm"
                      fullWidth
                    >
                      Complete Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div
              className={`shadow-card group relative overflow-hidden rounded-xl border transition-all ${
                isCourseCompleted
                  ? "border-brand-300 bg-brand-50"
                  : "border-neutral-200 bg-neutral-50 hover:shadow-card-hover"
              }`}
            >
              <div className="p-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
                  isCourseCompleted ? "bg-brand-100" : "bg-neutral-100"
                }`}>
                  <GraduationCap className={`h-6 w-6 ${
                    isCourseCompleted ? "text-brand-700" : "text-neutral-600"
                  }`} />
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isCourseCompleted ? "bg-brand-200" : "bg-neutral-200"
                  }`}>
                    <span className={`text-sm font-bold ${
                      isCourseCompleted ? "text-brand-900" : "text-neutral-700"
                    }`}>3</span>
                  </div>
                  <h4 className={`text-lg font-bold ${
                    isCourseCompleted ? "text-brand-900" : "text-neutral-800"
                  }`}>
                    Create a Course
                  </h4>
                </div>

                <p className={`mb-4 text-sm leading-relaxed ${
                  isCourseCompleted ? "text-brand-800" : "text-neutral-600"
                }`}>
                  Build your first course and start sharing your knowledge with
                  students around the world.
                </p>

                {isCourseCompleted ? (
                  <div className="flex items-center gap-2 rounded-lg bg-brand-100 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-700" />
                    <span className="text-brand-900 text-sm font-medium">
                      Completed
                    </span>
                  </div>
                ) : (
                  <Link href={`${basePath}/courses/new`}>
                    <Button
                      variant="brand"
                      size="sm"
                      fullWidth
                    >
                      Create Course
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <StripeConnectModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        instructorId={teacherId}
      />
    </div>
  )
}
