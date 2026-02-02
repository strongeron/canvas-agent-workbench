import { Upload, X } from "lucide-react"
import { type ChangeEvent, type DragEvent, useRef, useState } from "react"

import { Button } from "../../components/ui/button"
import { formatFileSize, simulateImageUpload } from "../utils/fileUpload"

export interface ImageUploadZoneProps {
  value?: string
  onChange: (url: string) => void
  onUploadStart?: () => void
  onUploadComplete?: () => void
  onUploadError?: (error: string) => void
}

export function ImageUploadZone({
  value,
  onChange,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value)
  const [imageInfo, setImageInfo] = useState<{
    name: string
    size: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((file) => file.type.startsWith("image/"))

    if (imageFile) {
      void handleFileUpload(imageFile)
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void handleFileUpload(file)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    onUploadStart?.()

    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const result = await simulateImageUpload(file, null)
      onChange(result.url)
      setImageInfo({
        name: file.name,
        size: formatFileSize(file.size),
      })
      onUploadComplete?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      onUploadError?.(errorMessage)
      setPreviewUrl(undefined)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setPreviewUrl(undefined)
    setImageInfo(null)
    onChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  if (previewUrl) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border-2 border-neutral-200">
          <img
            src={previewUrl}
            alt="Course cover preview"
            className="h-64 w-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="bg-error hover:bg-error/90 absolute right-3 top-3 rounded-full p-2 text-white shadow-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {imageInfo && (
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span className="truncate">{imageInfo.name}</span>
            <span className="text-muted ml-2 shrink-0">{imageInfo.size}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
        isDragging
          ? "border-brand-500 bg-brand-50"
          : "border-neutral-300 bg-surface-50 hover:border-brand-400 hover:bg-brand-50/50"
      } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center px-6 py-8 text-center">
        <div className="bg-brand-100 mb-4 rounded-full p-4">
          <Upload className="text-brand-600 h-8 w-8" />
        </div>

        <h3 className="text-foreground mb-2 text-lg font-semibold">
          {isUploading ? "Uploading..." : "Upload Course Cover Image"}
        </h3>

        <p className="text-muted-foreground mb-4 text-sm">
          Drag and drop your image here, or click to browse
        </p>

        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleBrowseClick}
          disabled={isUploading}
        >
          Browse Files
        </Button>

        <p className="text-muted mt-4 text-xs">
          Supported formats: JPG, PNG, WebP (Max 5MB)
        </p>
      </div>

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-brand-600 h-1 w-32 overflow-hidden rounded-full">
            <div className="h-full w-full animate-pulse bg-white/30" />
          </div>
        </div>
      )}
    </div>
  )
}
