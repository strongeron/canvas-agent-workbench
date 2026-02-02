import { ChevronDown } from "lucide-react"
import { type ReactNode, useState } from "react"

export interface AccordionItem {
  id: string
  question: string
  answer: string | ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
  defaultOpen?: string[]
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen))

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!allowMultiple) {
          next.clear()
        }
        next.add(id)
      }
      return next
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggleItem(id)
    }
  }

  return (
    <div className="divide-border-default border-default divide-y overflow-hidden rounded-lg border bg-white">
      {items.map((item) => {
        const isOpen = openItems.has(item.id)

        return (
          <div key={item.id} className="last:border-b-0">
            <button
              onClick={() => toggleItem(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className="hover:bg-surface-50 flex w-full items-center justify-between px-6 py-4 text-left transition-colors first:rounded-t-lg last:rounded-b-lg"
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
            >
              <span className="text-foreground pr-4 text-base font-semibold">
                {item.question}
              </span>
              <ChevronDown
                className={`text-brand-600 h-5 w-5 flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              id={`accordion-content-${item.id}`}
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isOpen ? "max-h-96" : "max-h-0"
              }`}
              aria-hidden={!isOpen}
            >
              <div className="text-muted-foreground px-6 pb-4 text-sm leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
