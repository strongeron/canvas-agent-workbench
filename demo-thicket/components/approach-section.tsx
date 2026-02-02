import { Link } from "@inertiajs/react"
import { useEffect, useRef, useState } from "react"

import { contacts_path } from "@thicket/routes"

export function ApproachSection({ variant = "image" }: { variant?: "image" | "video" }) {
  const [videoError, setVideoError] = useState(false)
  const [videoLoading, setVideoLoading] = useState(variant === "video")
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (variant === "video" && videoRef.current && !videoError) {
      const video = videoRef.current
      
      const handleCanPlay = () => {
        setVideoLoading(false)
        void video.play().catch((err) => {
          console.log("Autoplay prevented:", err)
        })
      }

      const handleError = (e: Event) => {
        const videoElement = e.target as HTMLVideoElement
        const error = videoElement.error

        if (error) {
          console.error("Video error code:", error.code, "message:", error.message)
          console.error("Current source:", videoElement.currentSrc)
        }

        setVideoError(true)
        setVideoLoading(false)
      }

      const handleLoadedData = () => {
        setVideoLoading(false)
        if (video.currentSrc) {
          console.log("Video loaded successfully:", video.currentSrc)
        }
      }

      video.addEventListener("canplay", handleCanPlay)
      video.addEventListener("error", handleError)
      video.addEventListener("loadeddata", handleLoadedData)

      // Try to play immediately
      void video.play().catch((err) => {
        console.log("Initial autoplay prevented:", err)
      })

      return () => {
        video.removeEventListener("canplay", handleCanPlay)
        video.removeEventListener("error", handleError)
        video.removeEventListener("loadeddata", handleLoadedData)
      }
    }
  }, [variant, videoError])
  return (
    <section className="bg-surface-50 pt-12 pb-16 md:pt-12 md:pb-20 lg:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="relative order-1 lg:order-1">
            <div className="bg-surface-200 border-subtle aspect-4/3 overflow-hidden rounded-2xl border shadow-lg">
              {variant === "video" ? (
                <>
                  {videoError ? (
                    <img
                      src="https://images.pexels.com/photos/4495983/pexels-photo-4495983.jpeg?auto=compress&cs=tinysrgb&w=1260"
                      alt="Thicket Online Learning Platform"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="relative h-full w-full">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                        poster="https://images.pexels.com/photos/4495983/pexels-photo-4495983.jpeg?auto=compress&cs=tinysrgb&w=1260"
                        aria-label="Thicket online learning platform demonstration"
                      >
                        <source
                          src="/videos/what-you-get/thicket-what-you-get.av1.mp4"
                          type='video/mp4; codecs="av01.0.05M.08"'
                        />
                        <source
                          src="/videos/what-you-get/thicket-what-you-get.hevc.mp4"
                          type='video/mp4; codecs="hvc1"'
                        />
                        <source
                          src="/videos/what-you-get/thicket-what-you-get.h264.mp4"
                          type='video/mp4; codecs="avc1.42E01E"'
                        />
                        Your browser does not support the video tag.
                      </video>
                      {videoLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface-200/80 backdrop-blur-sm">
                          <div className="text-muted-foreground text-sm">Loading video...</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <img
                  src="https://images.pexels.com/photos/6929164/pexels-photo-6929164.jpeg"
                  alt="Woman Sitting by the Wooden Table While Smiling"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="bg-brand-100 absolute -bottom-6 -left-6 -z-10 h-48 w-48 rounded-2xl" />
          </div>
          <div className="order-2 lg:order-2">
            <h2 className="font-display text-foreground mb-6 text-3xl font-bold md:text-4xl">
              What We Offer
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-foreground mb-2 text-xl font-semibold">
                  Live Online Classes
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Engage in lively discussions with your classmates and teacher
                  in a friendly and supportive environment. Classes have a
                  maximum of 15 students and meet weekly for 1 hour online.
                </p>
              </div>
              <div>
                <h3 className="font-display text-foreground mb-2 text-xl font-semibold">
                  Expert Teachers
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our teachers have researched and taught in top university
                  departments in history, literature, philosophy, and art.
                  They&apos;re passionate about sharing their love of learning
                  with others.
                </p>
              </div>
              <div>
                <h3 className="font-display text-foreground mb-2 text-xl font-semibold">
                  Big Ideas
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We think learning should be fun, inspiring, and approachable -
                  whether you&apos;re exploring ancient civilizations or
                  discussing your favorite author. Is there a topic that excites
                  you?{" "}
                  <Link
                    href={contacts_path()}
                    className="text-brand-600 hover:text-brand-700 decoration-brand-300 hover:decoration-brand-500 font-medium underline underline-offset-2 transition-colors"
                  >
                    Suggest a course here
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
