import { ExternalLink } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@thicket/components/ui/button"

export interface WherebyEmbedProps {
  roomUrl: string
  displayName?: string
  onLeave?: () => void
  onReady?: () => void
}

export function WherebyEmbed({
  roomUrl,
  displayName,
  onLeave,
  onReady,
}: WherebyEmbedProps) {
  const [windowOpened, setWindowOpened] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)

  const openInNewWindow = useCallback(() => {
    const roomUrlWithName = displayName
      ? `${roomUrl}?displayName=${encodeURIComponent(displayName)}`
      : roomUrl

    const windowFeatures = 'width=1200,height=800,toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes'

    const newWindow = window.open(roomUrlWithName, '_blank', windowFeatures)

    if (newWindow) {
      setWindowOpened(true)
      setPopupBlocked(false)

      newWindow.focus()

      const checkWindow = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkWindow)
          if (onLeave) {
            onLeave()
          }
        }
      }, 1000)

      if (onReady) {
        onReady()
      }
    } else {
      setPopupBlocked(true)
    }
  }, [displayName, onLeave, onReady, roomUrl])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openInNewWindow()
  }, [openInNewWindow])

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-surface-50">
      <div className="text-center max-w-md px-6">
        {popupBlocked ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-warning/10 p-4">
                <ExternalLink className="h-12 w-12 text-warning" />
              </div>
            </div>
            <h3 className="font-display text-foreground mb-3 text-xl font-semibold">
              Popup Blocked
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Your browser blocked the popup window. Please allow popups for this site or click the button below to open the lesson in a new window.
            </p>
            <Button
              variant="brand"
              size="lg"
              onClick={openInNewWindow}
              icon={ExternalLink}
            >
              Open Lesson in New Window
            </Button>
          </>
        ) : windowOpened ? (
          <>
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-success/10 p-4">
                <ExternalLink className="h-12 w-12 text-success" />
              </div>
            </div>
            <h3 className="font-display text-foreground mb-3 text-xl font-semibold">
              Lesson Opened in New Window
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Your video lesson has been opened in a new window. If you don&apos;t see it, check your browser&apos;s popup blocker settings.
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={openInNewWindow}
              icon={ExternalLink}
            >
              Reopen Lesson Window
            </Button>
          </>
        ) : (
          <>
            <div className="mb-6 flex justify-center">
              <div className="animate-pulse rounded-full bg-brand-100 p-4">
                <ExternalLink className="h-12 w-12 text-brand-600" />
              </div>
            </div>
            <h3 className="font-display text-foreground mb-3 text-xl font-semibold">
              Opening Lesson...
            </h3>
            <p className="text-muted-foreground text-sm">
              Your video lesson is opening in a new window.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
