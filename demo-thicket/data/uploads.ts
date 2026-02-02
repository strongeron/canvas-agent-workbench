export interface Upload {
  id: number
  filename: string
  original_name: string
  file_type: string
  size: number
  upload_date: string
  associated_course_id: number | null
  url: string
}

export const UPLOADS: Upload[] = []

export function addUpload(upload: Omit<Upload, "id">): Upload {
  const newUpload = {
    ...upload,
    id: UPLOADS.length + 1,
  }
  UPLOADS.push(newUpload)
  return newUpload
}

export function getUploadsByCourse(courseId: number): Upload[] {
  return UPLOADS.filter((upload) => upload.associated_course_id === courseId)
}

export function deleteUpload(id: number): boolean {
  const index = UPLOADS.findIndex((upload) => upload.id === id)
  if (index !== -1) {
    UPLOADS.splice(index, 1)
    return true
  }
  return false
}
