import { Play } from "lucide-react"
import { useState } from "react"

interface TeacherVideoIntroProps {
  videoUrl: string
  teacherName: string
}

export function TeacherVideoIntro({ videoUrl, teacherName }: TeacherVideoIntroProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  // Extract video ID and determine platform
  const getEmbedUrl = (url: string): string => {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/
    const youtubeMatch = youtubeRegex.exec(url)
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`
    }

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/
    const vimeoMatch = vimeoRegex.exec(url)
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    }

    // If it's already an embed URL, just add autoplay
    if (url.includes("embed") || url.includes("player")) {
      return url.includes("?") ? `${url}&autoplay=1` : `${url}?autoplay=1`
    }

    return url
  }

  // Get thumbnail URL
  const getThumbnailUrl = (url: string): string | null => {
    const youtubeRegex = /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/
    const youtubeMatch = youtubeRegex.exec(url)
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`
    }
    return null
  }

  const thumbnailUrl = getThumbnailUrl(videoUrl)
  const embedUrl = getEmbedUrl(videoUrl)

  return (
    <div className="bg-surface-50 border-default shadow-card overflow-hidden rounded-2xl border">
      <div className="relative aspect-video w-full bg-neutral-900">
        {!isPlaying ? (
          <>
            {/* Thumbnail */}
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={`Video introduction by ${teacherName}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30" />
            {/* Play button */}
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center transition-opacity hover:opacity-90"
              aria-label="Play video introduction"
            >
              <div className="bg-brand-600 hover:bg-brand-700 flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-colors">
                <Play className="ml-1 h-10 w-10 text-white" fill="white" />
              </div>
            </button>
            {/* Label */}
            <div className="absolute bottom-4 left-4">
              <span className="bg-black/60 rounded-lg px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                Meet {teacherName}
              </span>
            </div>
          </>
        ) : (
          <iframe
            src={embedUrl}
            title={`Video introduction by ${teacherName}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </div>
  )
}
