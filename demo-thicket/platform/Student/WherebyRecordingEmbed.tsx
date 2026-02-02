import { useEffect, useRef } from "react"
export interface WherebyRecordingEmbedProps {
  recordingUrl: string
  onReady?: () => void
}

type WherebyEmbedElement = HTMLElement & {
  addEventListener: HTMLElement["addEventListener"]
  removeEventListener: HTMLElement["removeEventListener"]
}

export function WherebyRecordingEmbed({
  recordingUrl,
  onReady,
}: WherebyRecordingEmbedProps) {
  const embedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const script = document.createElement("script")
    script.src = "https://cdn.srv.whereby.com/embed/v2-embed.js"
    script.type = "module"
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!embedRef.current) return

    const element = embedRef.current.querySelector<WherebyEmbedElement>("whereby-embed")
    if (!element) return

    const handleReady = () => {
      if (onReady) onReady()
    }

    element.addEventListener("ready", handleReady)

    return () => {
      element.removeEventListener("ready", handleReady)
    }
  }, [onReady])

  return (
    <div ref={embedRef} className="h-full w-full">
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore – custom element provided by Whereby embed script */}
      <whereby-embed
        room={recordingUrl}
        background="off"
        minimal
        className="h-full w-full"
      />
    </div>
  )
}
