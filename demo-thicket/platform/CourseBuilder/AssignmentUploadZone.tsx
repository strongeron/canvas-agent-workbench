import { FileText, Image as ImageIcon, Upload, X } from "lucide-react"
import { useCallback, useState } from "react"

import {
  formatFileSize,
  simulateDocumentUpload,
  simulateImageUpload,
  validateDocumentFile,
  validateImageFile,
} from "@thicket/platform/utils/fileUpload"
import type { Assignment } from "@thicket/types"

interface AssignmentUploadZoneProps {
  assignments: Assignment[]
  onAssignmentsChange: (assignments: Assignment[]) => void
  lessonId: number
}

export function AssignmentUploadZone({
  assignments,
  onAssignmentsChange,
  lessonId,
}: AssignmentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setIsUploading(true)
      const fileArray = Array.from(files)
      const newAssignments: Assignment[] = []

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        setUploadProgress(`Uploading ${i + 1} of ${fileArray.length}...`)

        try {
          const isImage = file.type.startsWith("image/")
          const validation = isImage
            ? validateImageFile(file)
            : validateDocumentFile(file)

          if (validation) {
            console.error(`File ${file.name}: ${validation.message}`)
            continue
          }

          let fileUrl: string
          if (isImage) {
            const result = await simulateImageUpload(file)
            fileUrl = result.url
          } else {
            const result = await simulateDocumentUpload(file)
            fileUrl = result.url
          }

          const newAssignment: Assignment = {
            id: Date.now() + i,
            lesson_id: lessonId,
            filename: file.name,
            original_name: file.name,
            file_url: fileUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
          }

          newAssignments.push(newAssignment)
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error)
        }
      }

      if (newAssignments.length > 0) {
        onAssignmentsChange([...assignments, ...newAssignments])
      }

      setIsUploading(false)
      setUploadProgress("")
    },
    [assignments, onAssignmentsChange, lessonId],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      void handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void handleFiles(e.target.files)
    },
    [handleFiles],
  )

  const removeAssignment = useCallback(
    (assignmentId: number) => {
      onAssignmentsChange(assignments.filter((a) => a.id !== assignmentId))
    },
    [assignments, onAssignmentsChange],
  )

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-default bg-surface-50 relative rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragging ? "border-brand-500 bg-brand-50" : ""
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,image/*"
          onChange={handleFileInput}
          disabled={isUploading}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <div className="flex flex-col items-center gap-2">
          <Upload className="text-muted-foreground h-8 w-8" />
          <div>
            <p className="text-foreground text-sm font-medium">
              {isUploading ? uploadProgress : "Drop files here or click to browse"}
            </p>
            <p className="text-muted mt-1 text-xs">
              PDF, DOC, DOCX, or images (max 10MB for documents, 5MB for images)
            </p>
          </div>
        </div>
      </div>

      {assignments.length > 0 && (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="border-default bg-surface-50 flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="text-brand-600">
                  {getFileIcon(assignment.file_type)}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {assignment.original_name}
                  </p>
                  <p className="text-muted text-xs">
                    {formatFileSize(assignment.file_size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAssignment(assignment.id)}
                className="text-muted-foreground hover:text-error transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
