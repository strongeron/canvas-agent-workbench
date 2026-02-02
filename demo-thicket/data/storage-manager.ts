type StorageKey =
  | 'marketplace_courses_session'
  | 'marketplace_students_session'
  | 'marketplace_instructors_session'
  | 'marketplace_messages_session'
  | 'marketplace_drafts_session'
  | 'marketplace_uploads_session'
  | 'marketplace_assignments_session'
  | 'marketplace_earnings_session'
  | 'marketplace_settings_session'
  | 'marketplace_reschedules_session'
  | 'marketplace_stripe_session'
  | 'marketplace_user_visits_session'
  | 'marketplace_lesson_timestamps_session'
  | 'marketplace_instructor_settings_session'
  | 'marketplace_course_files_session'
  | 'marketplace_hardcoded_initialized'
  | 'marketplace_threads_session'

export class StorageManager {
  private static instance: StorageManager | null = null
  private debugMode = false

  private constructor() {
    if (typeof window !== 'undefined') {
      this.debugMode = localStorage.getItem('marketplace_debug') === 'true'
    }
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  private log(operation: string, key: string, data?: unknown): void {
    if (this.debugMode) {
      console.log(`[StorageManager] ${operation}:`, key, data)
    }
  }

  get<T>(key: StorageKey): T | null {
    if (typeof window === 'undefined') return null

    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null

      const parsed = JSON.parse(raw) as T
      this.log('GET', key, parsed)
      return parsed
    } catch (error) {
      console.error(`[StorageManager] Error reading ${key}:`, error)
      return null
    }
  }

  set<T>(key: StorageKey, value: T): boolean {
    if (typeof window === 'undefined') return false

    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(key, serialized)
      this.log('SET', key, value)
      return true
    } catch (error) {
      console.error(`[StorageManager] Error writing ${key}:`, error)
      return false
    }
  }

  update<T>(key: StorageKey, updater: (current: T | null) => T): boolean {
    const current = this.get<T>(key)
    const updated = updater(current)
    return this.set(key, updated)
  }

  delete(key: StorageKey): boolean {
    if (typeof window === 'undefined') return false

    try {
      localStorage.removeItem(key)
      this.log('DELETE', key)
      return true
    } catch (error) {
      console.error(`[StorageManager] Error deleting ${key}:`, error)
      return false
    }
  }

  clear(): boolean {
    if (typeof window === 'undefined') return false

    try {
      const keys: StorageKey[] = [
        'marketplace_courses_session',
        'marketplace_students_session',
        'marketplace_instructors_session',
        'marketplace_messages_session',
        'marketplace_drafts_session',
        'marketplace_uploads_session',
        'marketplace_assignments_session',
        'marketplace_earnings_session',
        'marketplace_settings_session',
        'marketplace_reschedules_session',
        'marketplace_stripe_session',
        'marketplace_user_visits_session',
        'marketplace_lesson_timestamps_session',
        'marketplace_instructor_settings_session',
      ]

      keys.forEach(key => this.delete(key))
      this.log('CLEAR', 'all session data')
      return true
    } catch (error) {
      console.error('[StorageManager] Error clearing storage:', error)
      return false
    }
  }

  export(): Record<string, unknown> {
    if (typeof window === 'undefined') return {}

    const exportData: Record<string, unknown> = {}
    const keys: StorageKey[] = [
      'marketplace_courses_session',
      'marketplace_students_session',
      'marketplace_instructors_session',
      'marketplace_messages_session',
      'marketplace_drafts_session',
      'marketplace_uploads_session',
      'marketplace_assignments_session',
      'marketplace_earnings_session',
      'marketplace_settings_session',
      'marketplace_reschedules_session',
      'marketplace_stripe_session',
      'marketplace_user_visits_session',
      'marketplace_lesson_timestamps_session',
      'marketplace_instructor_settings_session',
    ]

    keys.forEach(key => {
      const data = this.get(key)
      if (data) {
        exportData[key] = data
      }
    })

    this.log('EXPORT', 'all data', exportData)
    return exportData
  }

  import(data: Record<string, unknown>): boolean {
    if (typeof window === 'undefined') return false

    try {
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('marketplace_')) {
          this.set(key as StorageKey, value)
        }
      })
      this.log('IMPORT', 'all data', data)
      return true
    } catch (error) {
      console.error('[StorageManager] Error importing data:', error)
      return false
    }
  }

  enableDebug(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('marketplace_debug', 'true')
      this.debugMode = true
    }
  }

  disableDebug(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('marketplace_debug')
      this.debugMode = false
    }
  }

  clearCourseDrafts(): boolean {
    if (typeof window === 'undefined') return false

    try {
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('course-draft-')) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        this.log('DELETE', key)
      })

      this.log('CLEAR', `${keysToRemove.length} course draft(s)`)
      return true
    } catch (error) {
      console.error('[StorageManager] Error clearing course drafts:', error)
      return false
    }
  }

  clearInstructorSettings(): boolean {
    if (typeof window === 'undefined') return false

    try {
      this.delete('marketplace_instructor_settings_session')
      this.log('CLEAR', 'instructor settings')
      return true
    } catch (error) {
      console.error('[StorageManager] Error clearing instructor settings:', error)
      return false
    }
  }

  clearAll(): boolean {
    if (typeof window === 'undefined') return false

    try {
      this.clear()
      this.clearCourseDrafts()
      this.clearInstructorSettings()
      this.log('CLEAR ALL', 'all data including drafts and settings')
      return true
    } catch (error) {
      console.error('[StorageManager] Error clearing all data:', error)
      return false
    }
  }
}

export const storage = StorageManager.getInstance()
