import type { CourseFile } from "@thicket/types"

import { getHardcodedCourseFiles } from "./hardcoded-course-files"
import { storage } from "./storage-manager"

const STORAGE_KEY = "marketplace_course_files_session"

export function getCourseFiles(courseId: number): CourseFile[] {
  const hardcodedFiles = getHardcodedCourseFiles()
  const sessionFiles = storage.get<CourseFile[]>(STORAGE_KEY) || []

  const mergedFiles = [...hardcodedFiles]

  sessionFiles.forEach(sessionFile => {
    const existingIndex = mergedFiles.findIndex(f => f.id === sessionFile.id)

    if (existingIndex >= 0) {
      mergedFiles[existingIndex] = { ...sessionFile }
    } else {
      mergedFiles.push({ ...sessionFile })
    }
  })

  return mergedFiles.filter((file) => file.course_id === courseId)
}

export function getAllCourseFiles(): CourseFile[] {
  const hardcodedFiles = getHardcodedCourseFiles()
  const sessionFiles = storage.get<CourseFile[]>(STORAGE_KEY) || []

  const mergedFiles = [...hardcodedFiles]

  sessionFiles.forEach(sessionFile => {
    const existingIndex = mergedFiles.findIndex(f => f.id === sessionFile.id)

    if (existingIndex >= 0) {
      mergedFiles[existingIndex] = { ...sessionFile }
    } else {
      mergedFiles.push({ ...sessionFile })
    }
  })

  return mergedFiles
}

export function uploadCourseFile(file: Omit<CourseFile, "id">): CourseFile {
  const allFiles = getAllCourseFiles()
  const sessionFiles = storage.get<CourseFile[]>(STORAGE_KEY) || []

  const maxId = allFiles.length > 0 ? Math.max(...allFiles.map((f) => f.id)) : 9999
  const newId = maxId >= 10000 ? maxId + 1 : 10000

  const newFile: CourseFile = {
    ...file,
    id: newId,
  }

  const updatedFiles = [...sessionFiles, newFile]
  storage.set(STORAGE_KEY, updatedFiles)

  return newFile
}

export function deleteCourseFile(fileId: number): boolean {
  const allFiles = storage.get<CourseFile[]>(STORAGE_KEY) || []

  const fileIndex = allFiles.findIndex((f) => f.id === fileId)
  if (fileIndex === -1) return false

  const updatedFiles = allFiles.filter((f) => f.id !== fileId)
  storage.set(STORAGE_KEY, updatedFiles)

  return true
}

export function updateCourseFile(
  fileId: number,
  updates: Partial<CourseFile>
): CourseFile | null {
  const allFiles = storage.get<CourseFile[]>(STORAGE_KEY) || []

  const fileIndex = allFiles.findIndex((f) => f.id === fileId)
  if (fileIndex === -1) return null

  const updatedFile = { ...allFiles[fileIndex], ...updates }
  allFiles[fileIndex] = updatedFile

  storage.set(STORAGE_KEY, allFiles)

  return updatedFile
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
}

export { formatFileSize }
