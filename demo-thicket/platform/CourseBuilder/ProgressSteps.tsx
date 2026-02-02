import { Check } from "lucide-react"
import { useEffect, useState } from "react"

export type BuilderStep = "design" | "preview" | "publish"

interface ProgressStepsProps {
  currentStep: BuilderStep
  onStepClick: (step: BuilderStep) => void
  canNavigateToPreview: boolean
  canNavigateToPublish: boolean
}

const steps: { id: BuilderStep; label: string; number: number }[] = [
  { id: "design", label: "Design", number: 1 },
  { id: "preview", label: "Preview", number: 2 },
  { id: "publish", label: "Publish", number: 3 },
]

export function ProgressSteps({
  currentStep,
  onStepClick,
  canNavigateToPreview,
  canNavigateToPublish,
}: ProgressStepsProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const currentStepNumber = steps.find((s) => s.id === currentStep)?.number || 1

  const canNavigateTo = (step: BuilderStep) => {
    if (step === "design") return true
    if (step === "preview") return canNavigateToPreview
    if (step === "publish") return canNavigateToPublish
    return false
  }

  const isCompleted = (stepNumber: number) => stepNumber < currentStepNumber

  return (
    <div
      className={`sticky top-0 z-40 border-b border-default bg-white transition-shadow duration-200 ${
        isScrolled ? "shadow-md" : ""
      }`}
    >
      <div className="mx-auto max-w-3xl px-4">
        <nav aria-label="Progress">
          <div className="flex items-center">
            {steps.map((step, stepIdx) => {
              const completed = isCompleted(step.number)
              const current = currentStep === step.id
              const clickable = canNavigateTo(step.id)

              return (
                <div
                  key={step.id}
                  className="relative flex flex-1"
                >
                  <button
                    onClick={() => clickable && onStepClick(step.id)}
                    disabled={!clickable}
                    className={`
                      relative flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-all sm:px-4 sm:py-4
                      ${
                        current
                          ? "border-brand-600 text-brand-600"
                          : completed
                            ? "border-transparent text-neutral-700 hover:border-neutral-200"
                            : "border-transparent text-neutral-400"
                      }
                      ${clickable ? "cursor-pointer" : "cursor-not-allowed"}
                      ${clickable && !current ? "hover:text-neutral-900" : ""}
                    `}
                  >
                    <span
                      className={`
                        flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all
                        ${
                          current
                            ? "bg-brand-600 text-white"
                            : completed
                              ? "bg-green-100 text-green-700"
                              : "bg-neutral-100 text-neutral-500"
                        }
                      `}
                    >
                      {completed ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : (
                        step.number
                      )}
                    </span>
                    <span className="hidden xs:inline sm:inline">{step.label}</span>
                  </button>

                  {stepIdx !== steps.length - 1 && (
                    <div
                      className="absolute bottom-0 right-0 h-0.5 w-px"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
