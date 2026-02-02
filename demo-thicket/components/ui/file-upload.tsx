import { FileText, Upload, X } from "lucide-react"
import { useRef, useState } from "react"

interface FileUploadProps {
  label: string
  name?: string
  accept?: string
  maxSize?: number
  error?: string
  onChange?: (file: File | null) => void
  helperText?: string
}

export function FileUpload({
  label,
  name,
  accept = ".pdf,.doc,.docx",
  maxSize = 5 * 1024 * 1024,
  error,
  onChange,
  helperText,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (selectedFile: File | null) => {
    if (!selectedFile) return

    if (selectedFile.size > maxSize) {
      setUploadError(`File size must be less than ${maxSize / 1024 / 1024}MB`)
      return
    }

    setUploadError("")
    setFile(selectedFile)
    onChange?.(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null
    handleFile(selectedFile)
  }

  const handleRemove = () => {
    setFile(null)
    setUploadError("")
    onChange?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const displayError = error ?? uploadError

  return (
    <div className="w-full">
      <label className="text-muted-foreground mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200 ${
            isDragging
              ? "border-brand-500 bg-brand-50"
              : displayError
                ? "border-error bg-error/5"
                : "border-default hover:border-brand-400 bg-surface-50 hover:bg-brand-50/50"
          }`}
        >
          <Upload
            className={`mx-auto mb-4 h-12 w-12 ${
              isDragging
                ? "text-brand-600"
                : displayError
                  ? "text-error"
                  : "text-muted"
            }`}
          />
          <p className="text-foreground mb-2 text-sm font-medium">
            Click to upload or drag and drop
          </p>
          <p className="text-muted text-xs">
            {helperText ?? "PDF, DOC, DOCX (max 5MB)"}
          </p>
        </div>
      ) : (
        <div className="border-default hover:border-strong flex items-center justify-between rounded-lg border bg-white p-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-brand-100 flex h-10 w-10 items-center justify-center rounded-lg">
              <FileText className="text-brand-600 h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">{file.name}</p>
              <p className="text-muted text-xs">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {displayError && (
        <p className="text-error mt-2 text-sm">{displayError}</p>
      )}
    </div>
  )
}
