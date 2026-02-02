import { Upload, X } from "lucide-react"
import { useRef, useState } from "react"

import { UserAvatar } from "@thicket/components/ui/user-avatar"

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

export interface PhotoUploadProps {
  value: string // Current avatar URL or data URL (single source of truth)
  onChange: (value: string) => void // Called with data URL or empty string
  onError: (error: string) => void // Required for error handling (parent handles toast)
  maxSize?: number // Default: 5 * 1024 * 1024 (5MB)
  previewSize?: AvatarSize // Default: "lg" (matches UserAvatar)
  showRemove?: boolean // Default: true
  accept?: string // Default: "image/*"
  name?: string // For fallback initial letter display (used by UserAvatar)
  label?: React.ReactNode // Optional label above upload zone
  helperText?: string // Optional helper text
}

// Map previewSize to UserAvatar size, but use larger border for photo upload
const previewSizeMap: Record<AvatarSize, { avatarSize: AvatarSize; containerSize: string }> = {
  xs: { avatarSize: "xs", containerSize: "h-8 w-8" },
  sm: { avatarSize: "sm", containerSize: "h-12 w-12" },
  md: { avatarSize: "md", containerSize: "h-20 w-20" },
  lg: { avatarSize: "lg", containerSize: "h-32 w-32" },
  xl: { avatarSize: "xl", containerSize: "h-40 w-40" },
}

export function PhotoUpload({
  value,
  onChange,
  onError,
  maxSize = 5 * 1024 * 1024,
  previewSize = "lg",
  showRemove = true,
  accept = "image/*",
  name = "",
  label,
  helperText,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      onError("Please upload an image file")
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0)
      onError(`Image size must be less than ${maxSizeMB}MB`)
      return
    }

    // Convert to data URL
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      onChange(result)
    }
    reader.onerror = () => {
      onError("Failed to read file. Please try again.")
    }
    reader.readAsDataURL(file)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemovePhoto = () => {
    onChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const sizeConfig = previewSizeMap[previewSize]

  return (
    <div className="w-full">
      {label && (
        <label className="text-foreground mb-3 block text-sm font-medium">
          {label}
        </label>
      )}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-default bg-surface-100"
        }`}
      >
        <div className="p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative">
              <div
                className={`border-default bg-surface-50 shrink-0 overflow-hidden rounded-full border-4 shadow-lg ${sizeConfig.containerSize}`}
              >
                <UserAvatar
                  src={value}
                  alt={name || "Profile"}
                  size={sizeConfig.avatarSize}
                />
              </div>
              {value && showRemove && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-foreground mb-2 text-sm font-medium">
                {value ? "Change your profile photo" : "Upload your profile photo"}
              </p>
              <p className="text-muted mb-4 text-xs">
                {helperText ||
                  "Drag and drop or click to browse. Square image recommended, at least 400x400px. Maximum 5MB."}
              </p>
              <label className="inline-block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-default bg-white px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-strong hover:bg-surface-50">
                  <Upload className="h-4 w-4" />
                  Choose Photo
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

