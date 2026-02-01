/**
 * Select - Demo select/dropdown component for gallery
 */

import { ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label?: string
  value?: string
  onChange?: (value: string) => void
  options?: SelectOption[]
  placeholder?: string
  disabled?: boolean
  error?: string
}

const defaultOptions: SelectOption[] = [
  { value: "option1", label: "Option 1" },
  { value: "option2", label: "Option 2" },
  { value: "option3", label: "Option 3" },
  { value: "option4", label: "Option 4" },
]

export function Select({
  label,
  value,
  onChange,
  options = defaultOptions,
  placeholder = "Select an option",
  disabled = false,
  error,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm ${
          disabled
            ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
            : error
              ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        }`}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange?.(option.value)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                option.value === value
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}
