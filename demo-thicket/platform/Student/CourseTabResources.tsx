import { Download, File, FileCheck, FileText, FileType, Image, Layers, Sparkles } from "lucide-react"

import { useToast } from "../../hooks/useToast"
import { getCourseFiles } from "../../data/course-files"
import type { CourseFile } from "../../types"

interface CourseTabResourcesProps {
  courseId: number
}

type ResourceCategory = "assignment" | "additional"

function categorizeResource(file: CourseFile): ResourceCategory {
  const name = file.name.toLowerCase()

  if (name.includes("assignment") || name.includes("template")) {
    return "assignment"
  }
  return "additional"
}

function getCategoryInfo(category: ResourceCategory) {
  const configs = {
    assignment: {
      label: "Assignments",
      icon: FileCheck,
      color: "text-brand-700",
      bgColor: "bg-brand-50",
      borderColor: "border-brand-200",
      badgeColor: "bg-brand-100 text-brand-700",
    },
    additional: {
      label: "Additional Materials",
      icon: Layers,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      badgeColor: "bg-blue-100 text-blue-700",
    },
  }
  return configs[category]
}

export function CourseTabResources({ courseId }: CourseTabResourcesProps) {
  const files = getCourseFiles(courseId)
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

  const isRecentlyUploaded = (uploadedAt: string) => {
    const uploadDate = new Date(uploadedAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
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

  const categorizedFiles = files.reduce((acc, file) => {
    const category = categorizeResource(file)
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(file)
    return acc
  }, {} as Record<ResourceCategory, CourseFile[]>)

  const categoryOrder: ResourceCategory[] = ["assignment", "additional"]

  return (
    <div>
      {files.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-surface-200 bg-surface-50 p-12 text-center">
          <FileText className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
          <p className="text-muted-foreground">
            No course resources available yet
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Check back later for slides, assignments, and other learning materials from your instructor
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg bg-brand-50 border border-brand-200 p-4">
            <p className="text-brand-700 text-sm">
              <strong>{files.length}</strong> resource{files.length !== 1 ? "s" : ""} available for download
            </p>
          </div>

          {categoryOrder.map((category) => {
            const categoryFiles = categorizedFiles[category]
            if (!categoryFiles || categoryFiles.length === 0) return null

            const categoryInfo = getCategoryInfo(category)
            const CategoryIcon = categoryInfo.icon

            return (
              <div key={category}>
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${categoryInfo.bgColor} ${categoryInfo.borderColor} border`}>
                    <CategoryIcon className={`h-5 w-5 ${categoryInfo.color}`} />
                  </div>
                  <div>
                    <h3 className="text-foreground text-lg font-semibold">
                      {categoryInfo.label}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {categoryFiles.length} item{categoryFiles.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {categoryFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type)
                    const badge = getFileTypeBadge(file.type)
                    const isNew = isRecentlyUploaded(file.uploaded_at)

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
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="text-foreground font-semibold truncate">
                                  {file.name}
                                </h4>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.color}`}>
                                  {badge.label}
                                </span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${categoryInfo.badgeColor}`}>
                                  {category === "assignment" ? "Assignment" : "Additional Material"}
                                </span>
                                {isNew && (
                                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-700">
                                    <Sparkles className="h-3 w-3" />
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground mb-2 text-sm">
                                {file.size_formatted} • Uploaded{" "}
                                {new Date(file.uploaded_at).toLocaleDateString()} by{" "}
                                {file.uploaded_by_name}
                              </p>
                              {file.message && (
                                <div className="mt-3 rounded-md bg-brand-50 p-3 border border-brand-100">
                                  <p className="text-brand-900 text-sm">
                                    <span className="font-medium">From your instructor:</span> &quot;{file.message}&quot;
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            className="text-brand-600 hover:bg-brand-50 shrink-0 rounded-lg p-2 transition-colors"
                            onClick={() => handleDownload(file)}
                            title="Download resource"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
