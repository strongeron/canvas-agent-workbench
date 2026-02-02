type UploadResult = { url: string }

export function formatFileSize(size: number) {
  if (!Number.isFinite(size)) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let value = size
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function validateImageFile(file: File) {
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { message: "Image must be under 5MB" }
  }
  return null
}

export function validateDocumentFile(file: File) {
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { message: "Document must be under 10MB" }
  }
  return null
}

async function simulateUpload(file: File): Promise<UploadResult> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return { url: URL.createObjectURL(file) }
}

export function simulateImageUpload(file: File) {
  return simulateUpload(file)
}

export function simulateDocumentUpload(file: File) {
  return simulateUpload(file)
}

export function simulateFileDelete() {
  return Promise.resolve(true)
}

