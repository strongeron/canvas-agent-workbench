import { CheckCircle2 } from "lucide-react"
import { useMemo } from "react"

import { Button } from "../components/ui/button"
import { Modal } from "../components/ui/modal"

type ConfettiStyle = {
  key: number
  left: string
  animationDelay: string
  animationDuration: string
}

const CONFETTI_PRESETS: ConfettiStyle[] = Array.from(
  { length: 20 },
  (_, i) => {
    const left = `${(i * 17) % 100}%`
    const animationDelay = `${(i % 5) * 0.1}s`
    const animationDuration = `${2 + (i % 4) * 0.25}s`

    return { key: i, left, animationDelay, animationDuration }
  }
)

interface CongratulationsModalProps {
  isOpen: boolean
  onClose: () => void
  teacherName: string
}

export function CongratulationsModal({
  isOpen,
  onClose,
  teacherName,
}: CongratulationsModalProps) {
  const confettiStyles = useMemo(() => CONFETTI_PRESETS, [])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="medium"
        aria-labelledby="congratulations-title"
        aria-describedby="congratulations-description"
      >
        <Modal.Body>
          <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-white p-8">
            <div className="confetti-container pointer-events-none absolute inset-0">
              {confettiStyles.map(({ key, left, animationDelay, animationDuration }) => (
                <div
                  key={key}
                  className="confetti"
                  style={{ left, animationDelay, animationDuration }}
                />
              ))}
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-75" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
                    <CheckCircle2 className="h-10 w-10 text-brand-600" />
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h2 id="congratulations-title" className="font-display mb-2 text-3xl font-bold text-brand-900">
                  Congratulations!
                </h2>
                <p className="text-lg font-medium text-brand-800">
                  You&apos;re all set up, {teacherName}!
                </p>
              </div>

              <div id="congratulations-description" className="rounded-lg bg-brand-50 p-4">
                <p className="text-center text-sm leading-relaxed text-brand-900">
                  You&apos;ve completed all the setup steps and are ready to start your
                  teaching journey. Your profile is complete, payment processing is
                  configured, and you have courses ready to share with students
                  worldwide.
                </p>
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer align="center">
          <Button variant="brand" size="lg" onClick={onClose}>
            Start Teaching
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        .confetti {
          position: absolute;
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-400));
          animation: confetti-fall linear infinite;
          border-radius: 2px;
        }

        .confetti:nth-child(2n) {
          background: linear-gradient(135deg, var(--color-sky-500), var(--color-sky-400));
        }

        .confetti:nth-child(3n) {
          background: linear-gradient(135deg, var(--color-amber-500), var(--color-amber-400));
        }

        .confetti:nth-child(4n) {
          background: linear-gradient(135deg, var(--color-pink-500), var(--color-pink-400));
        }

        .confetti:nth-child(5n) {
          background: linear-gradient(135deg, var(--color-violet-500), var(--color-violet-400));
          width: 6px;
          height: 12px;
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </>
  )
}
