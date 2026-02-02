import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface AutocompleteProps {
  label: string
  value: string
  onChange?: (value: string) => void
  onSelect: (value: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Autocomplete({
  label,
  value: defaultValue,
  onChange: userOnChange,
  onSelect,
  suggestions,
  placeholder = "Start typing...",
  className = "",
  disabled = false,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [internalSuggestions, setInternalSuggestions] = useState(
    () => suggestions,
  )
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onChange = (value: string) => {
    if (userOnChange) {
      userOnChange(value)
      setInternalSuggestions(suggestions)
      return
    }

    const text = value.toLowerCase()
    setInternalSuggestions(
      suggestions.filter((f) => f.toLowerCase().includes(text)),
    )
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onChange(newValue)
    setIsOpen(true)
    setSelectedIndex(-1)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < internalSuggestions.length - 1 ? prev + 1 : prev,
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < internalSuggestions.length) {
          const selected = internalSuggestions[selectedIndex]
          onChange(selected)
          setValue(selected)
          onSelect?.(selected)
          setIsOpen(false)
          setSelectedIndex(-1)
        }
        break
      case "Escape":
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setValue(suggestion)
    onSelect?.(suggestion)
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
  }

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <label className="text-muted-foreground mb-2 block text-sm font-medium">
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="border-default text-foreground placeholder:text-muted focus:border-brand-300 focus:ring-brand-300 hover:border-strong block h-11 w-full rounded-lg border bg-white px-4 py-3 pr-10 text-base transition-all duration-200 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />
        <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
      </div>

      {isOpen && internalSuggestions.length > 0 && (
        <ul className="border-default shadow-card absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white py-1">
          {internalSuggestions.map((suggestion, index) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={`text-foreground block w-full px-4 py-2.5 text-left text-base transition-colors duration-150 outline-none ${
                  index === selectedIndex ? "bg-brand-50" : "hover:bg-brand-50/50"
                }`}
                role="option"
                title={suggestion}
              >
                <span className="block truncate">{suggestion}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
