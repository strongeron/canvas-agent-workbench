import { router } from "@inertiajs/react"
import { Download, File, FileText, FileType, Image, Trash2, Upload, X } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@thicket/components/ui/button"
import { Textarea } from "@thicket/components/ui/textarea"
import { useToast } from "@thicket/hooks/useToast"
import { deleteCourseFile, formatFileSize, getCourseFiles, uploadCourseFile } from "@thicket/data/course-files"
import type { CourseFile } from "@thicket/types"

interface CourseTabFilesProps {
  courseId: number
  instructorId: number
  instructorName: string
}

export function CourseTabFilesTeacher({ courseId, instructorId, instructorName }: CourseTabFilesProps) {
  const files = getCourseFiles(courseId)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { success, error } = useToast()

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return FileText
    if (type.includes("image")) return Image
    if (type.includes("word") || type.includes("document")) return FileType
    if (type.includes("presentation") || type.includes("powerpoint")) return FileType
    return File
  }

  const getFileTypeBadge = (type: string) => {
    if (type.includes("pdf")) return { label: "PDF", color: "bg-red-100 text-red-700" }
    if (type.includes("image")) return { label: "IMAGE", color: "bg-blue-100 text-blue-700" }
    if (type.includes("word") || type.includes("document")) return { label: "DOC", color: "bg-blue-100 text-blue-700" }
    if (type.includes("presentation") || type.includes("powerpoint")) return { label: "PPT", color: "bg-orange-100 text-orange-700" }
    return { label: "FILE", color: "bg-gray-100 text-gray-700" }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        error("File size must be less than 10MB")
        return
      }

      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/jpeg",
        "image/png",
        "image/gif",
      ]

      if (!allowedTypes.includes(file.type)) {
        error("File type not supported. Please upload PDF, DOC, DOCX, PPT, PPTX, or images")
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (!selectedFile) return

    setIsUploading(true)

    try {
      const reader = new FileReader()
      reader.onload = () => {
        const fileData = reader.result as string

        uploadCourseFile({
          course_id: courseId,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          size_formatted: formatFileSize(selectedFile.size),
          uploaded_at: new Date().toISOString(),
          uploaded_by: instructorId,
          uploaded_by_name: instructorName,
          message: message.trim(),
          file_data: fileData,
        })

        success(`File "${selectedFile.name}" uploaded successfully!`)
        setSelectedFile(null)
        setMessage("")
        setIsUploading(false)
        router.reload()
      }

      reader.onerror = () => {
        error("Failed to read file. Please try again.")
        setIsUploading(false)
      }

      reader.readAsDataURL(selectedFile)
    } catch {
      error("Failed to upload file. Please try again.")
      setIsUploading(false)
    }
  }

  const handleDownload = (file: CourseFile) => {
    if (!file.file_data) {
      error("File data not available for download")
      return
    }

    try {
      const byteString = atob(file.file_data.split(",")[1])
      const mimeString = file.file_data.split(",")[0].split(":")[1].split(";")[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)

      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }

      const blob = new Blob([ab], { type: mimeString })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      success(`Downloading "${file.name}"...`)
    } catch {
      error("Failed to download file. Please try again.")
    }
  }

  const handleDelete = (file: CourseFile) => {
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      const success_result = deleteCourseFile(file.id)
      if (success_result) {
        success(`File "${file.name}" deleted successfully!`)
        router.reload()
      } else {
        error("Failed to delete file. Please try again.")
      }
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setMessage("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-default bg-white p-6">
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          Upload Course Resources
        </h3>

        <div className="space-y-4">
          {!selectedFile ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-surface-300 bg-surface-50 p-8 transition-colors hover:border-brand-500 hover:bg-brand-50"
              >
                <Upload className="h-8 w-8 text-brand-600" />
                <div className="text-left">
                  <p className="text-foreground font-medium">
                    Click to upload a file
                  </p>
                  <p className="text-muted-foreground text-sm">
                    PDF, DOC, DOCX, PPT, PPTX, or images (max 10MB)
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-default bg-surface-50 p-4">
                <FileText className="h-8 w-8 text-brand-600" />
                <div className="flex-1">
                  <p className="text-foreground font-medium">{selectedFile.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <Textarea
                  label="Message for Students"
                  placeholder="Add a message to help students understand this resource..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="brand"
                  onClick={handleUpload}
                  disabled={isUploading}
                  icon={Upload}
                >
                  {isUploading ? "Uploading..." : "Upload File"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          Uploaded Resources ({files.length})
        </h3>

        {files.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-surface-200 bg-surface-50 p-12 text-center">
            <FileText className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
            <p className="text-muted-foreground">
              No resources uploaded yet. Share course materials with your students.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.type)
              const badge = getFileTypeBadge(file.type)

              return (
                <div
                  key={file.id}
                  className="rounded-lg border border-default bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                        <FileIcon className="h-6 w-6 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-foreground font-semibold truncate">
                            {file.name}
                          </h4>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-2 text-sm">
                          {file.size_formatted} • Uploaded{" "}
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </p>
                        {file.message && (
                          <div className="mt-3 rounded-md bg-surface-50 p-3 border border-surface-200">
                            <p className="text-muted-foreground text-sm">
                              &quot;{file.message}&quot;
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleDownload(file)}
                        className="text-brand-600 hover:bg-brand-50 rounded-lg p-2 transition-colors"
                        title="Download file"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="text-error hover:bg-error/10 rounded-lg p-2 transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
