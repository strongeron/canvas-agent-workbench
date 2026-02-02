import type { ReactNode } from "react"

interface Tab {
  id: string
  label: string
  content: ReactNode
}

export interface CourseTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function CourseTabs({ tabs, activeTab, onTabChange }: CourseTabsProps) {
  return (
    <div className="overflow-hidden">
      <div className="relative border-b border-default bg-gradient-to-r from-white via-white to-surface-50">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "border-brand-600 text-brand-600"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}
