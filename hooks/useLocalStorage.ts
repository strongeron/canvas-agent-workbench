/**
 * Gallery POC - localStorage Hook
 *
 * Simple hook for persisting state to localStorage.
 * Includes SSR safety and JSON serialization.
 */

import { useCallback, useEffect, useRef, useState } from "react"

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const initialValueRef = useRef(initialValue)
  initialValueRef.current = initialValue

  // Initialize state with stored value or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // Return a wrapped setter that persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          } catch (error) {
            console.warn(`Failed to save to localStorage key "${key}":`, error)
          }
        }

        return valueToStore
      })
    },
    [key]
  )

  // Refresh stored value when key changes
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const item = window.localStorage.getItem(key)
      setStoredValue(item ? JSON.parse(item) : initialValueRef.current)
    } catch {
      setStoredValue(initialValueRef.current)
    }
  }, [key])

  // Sync across tabs
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          if (e.newValue == null) {
            setStoredValue(initialValueRef.current)
            return
          }
          setStoredValue(JSON.parse(e.newValue))
        } catch {
          // Ignore invalid JSON
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [key])

  return [storedValue, setValue]
}
