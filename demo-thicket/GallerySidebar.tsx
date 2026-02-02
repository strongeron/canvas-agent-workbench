import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Hash } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { 
  type ComponentEntry, 
  componentsByCategory,
  type LayoutEntry,
  type PagePatternEntry,
  layoutsByCategory,
  patternsByCategory,
  getLayoutsByContext,
  getPatternsByContext,
} from "../mocks/componentVariants"

import { getCategoryLabel, groupVariantsByCategory } from "./ComponentSection"

interface GallerySidebarProps {
  categories: string[]
  selectedCategory: string
  onSelectCategory: (category: string) => void
  viewMode: string
  layoutViewType?: 'all' | 'layout-components' | 'page-patterns'
  layoutContext?: 'all' | 'public' | 'student' | 'teacher' | 'global'
}

export function GallerySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  viewMode,
  layoutViewType = 'all',
  layoutContext = 'all',
}: GallerySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const activeComponent = useMemo(() => {
    if (!activeId) return null
    return activeId.includes('-') ? activeId.split('-')[0] : activeId
  }, [activeId])

  const activeSection = useMemo(() => {
    if (!activeId) return null
    return activeId.includes('-') ? activeId : null
  }, [activeId])

  useEffect(() => {
    const saved = localStorage.getItem('gallery_sidebar_collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('gallery_sidebar_collapsed', isCollapsed.toString())
  }, [isCollapsed])

  useEffect(() => {
    if (viewMode !== 'components' && viewMode !== 'layouts') return

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = (scrollTop / docHeight) * 100
      setScrollProgress(progress)
      setShowBackToTop(scrollTop > 400)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [viewMode])

  useEffect(() => {
    if (viewMode !== 'components') return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isUserScrolling) return

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const elementId = entry.target.id
            if (elementId) {
              setActiveId(elementId)
            }
          }
        })
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -40% 0px'
      }
    )

    const observeElements = () => {
      // Observe all component sections
      Object.values(componentsByCategory).flat().forEach((component: ComponentEntry) => {
        const element = document.getElementById(component.name.toLowerCase())
        if (element && observerRef.current) {
          observerRef.current.observe(element)
        }

        // Observe sub-sections for UnifiedLessonCard
        if (component.name === 'UnifiedLessonCard') {
          const variantGroups = groupVariantsByCategory(component.variants)
          Array.from(variantGroups.keys()).forEach((categoryKey) => {
            const sectionElement = document.getElementById(`${component.name.toLowerCase()}-${categoryKey}`)
            if (sectionElement && observerRef.current) {
              observerRef.current.observe(sectionElement)
            }
          })
        }
      })
    }

    const timeoutId = setTimeout(observeElements, 100)

    return () => {
      clearTimeout(timeoutId)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [viewMode, selectedCategory, isUserScrolling])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const handleSelectCategory = (category: string) => {
    onSelectCategory(category)
    if (category !== 'all') {
      setExpandedCategories(prev => {
        const newSet = new Set(prev)
        newSet.add(category)
        return newSet
      })
    }
  }

  const scrollToElement = (elementId: string, categoryToExpand?: string) => {
    setActiveId(elementId)
    setIsUserScrolling(true)

    if (categoryToExpand) {
      setExpandedCategories(prev => {
        const newSet = new Set(prev)
        newSet.add(categoryToExpand)
        return newSet
      })
    }

    const element = document.getElementById(elementId)
    if (element) {
      const headerHeight = 140
      const elementPosition = element.getBoundingClientRect().top + window.scrollY
      window.scrollTo({
        top: elementPosition - headerHeight,
        behavior: 'smooth'
      })
    }

    setTimeout(() => setIsUserScrolling(false), 400)
  }

  const scrollToComponent = (componentName: string, category?: string) => {
    scrollToElement(componentName.toLowerCase(), category)
  }

  const scrollToSection = (componentName: string, sectionKey: string, category?: string) => {
    scrollToElement(`${componentName.toLowerCase()}-${sectionKey}`, category)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToLayout = (layoutId: string) => {
    const elementId = layoutId.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')
    scrollToElement(elementId)
  }

  const scrollToCategory = (category: string) => {
    const categoryId = category.toLowerCase().replace(/\s+/g, '-')
    scrollToElement(categoryId)
  }

  if (viewMode !== 'components' && viewMode !== 'layouts') {
    return null
  }

  // Get layouts and patterns based on filters
  const filteredLayouts = layoutViewType === 'all' || layoutViewType === 'layout-components'
    ? getLayoutsByContext(layoutContext || 'all')
    : []
  const filteredPatterns = layoutViewType === 'all' || layoutViewType === 'page-patterns'
    ? getPatternsByContext(layoutContext || 'all')
    : []

  const layoutCategories = Object.keys(layoutsByCategory)
  const patternCategories = Object.keys(patternsByCategory)

  return (
    <aside className={`sticky top-[140px] h-[calc(100vh-140px)] border-r border-default bg-white transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
      <div className="absolute left-0 right-0 top-0 h-1 bg-surface-100">
        <div
          className="h-full bg-linear-to-r from-brand-500 to-brand-700 transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-default bg-white shadow-sm transition-colors hover:bg-surface-50"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {showBackToTop && !isCollapsed && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl"
          title="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <div className={`flex h-full flex-col overflow-hidden ${isCollapsed ? 'px-2 pt-4' : 'p-6 pt-4'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center space-y-4 overflow-y-auto">
            {showBackToTop && (
              <button
                onClick={scrollToTop}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white shadow-md transition-all hover:bg-brand-700"
                title="Back to top"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
            {viewMode === 'components' ? (
              categories.map((category) => {
                const isSelected = selectedCategory === category
                const firstLetter = category === 'all' ? 'A' : category.charAt(0).toUpperCase()
                return (
                  <button
                    key={category}
                    onClick={() => onSelectCategory(category)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'bg-surface-100 text-muted-foreground hover:bg-surface-200'
                    }`}
                    title={category === 'all' ? 'All Components' : category}
                  >
                    {firstLetter}
                  </button>
                )
              })
            ) : (
              <>
                {layoutCategories.map((category) => {
                  const firstLetter = category.charAt(0).toUpperCase()
                  return (
                    <button
                      key={category}
                      onClick={() => scrollToCategory(category)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-muted-foreground text-sm font-bold transition-all hover:bg-surface-200"
                      title={category}
                    >
                      {firstLetter}
                    </button>
                  )
                })}
                {patternCategories.map((category) => {
                  const firstLetter = category.charAt(0).toUpperCase()
                  return (
                    <button
                      key={category}
                      onClick={() => scrollToCategory(category)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-muted-foreground text-sm font-bold transition-all hover:bg-surface-200"
                      title={category}
                    >
                      {firstLetter}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 min-h-0 flex-1 overflow-y-auto">
              <h3 className="font-display text-foreground mb-3 text-sm font-bold uppercase tracking-wider">
                {viewMode === 'components' ? 'Components' : 'Layouts'}
              </h3>
              <nav className="space-y-2 pb-4">
                {viewMode === 'components' ? (
                  // Components navigation
                  categories.map((category) => {
                    const isSelected = selectedCategory === category
                    const isExpanded = expandedCategories.has(category)
                    const categoryComponents = category === 'all' ? [] : componentsByCategory[category] || []
                    const hasComponents = categoryComponents.length > 0

                    return (
                      <div key={category}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSelectCategory(category)}
                            className={`flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-muted-foreground hover:bg-surface-50 hover:text-foreground'
                            }`}
                          >
                            <span className="truncate">{category === 'all' ? 'All Components' : category}</span>
                            {hasComponents && (
                              <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[10px] font-medium text-muted">
                                {categoryComponents.length}
                              </span>
                            )}
                          </button>
                          {hasComponents && (
                            <button
                              onClick={() => toggleCategory(category)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-100"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {hasComponents && isExpanded && (
                          <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-brand-200 pl-3">
                            {categoryComponents.map((component: ComponentEntry) => {
                              const isActive = activeComponent === component.name.toLowerCase()
                              const hasSubSections = component.name === 'UnifiedLessonCard'
                              const variantGroups = hasSubSections ? groupVariantsByCategory(component.variants) : null

                              return (
                                <div key={component.name}>
                                  <button
                                    onClick={() => scrollToComponent(component.name, category)}
                                    className={`group block w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                      isActive
                                        ? 'bg-brand-50 text-brand-700 font-medium'
                                        : 'text-muted-foreground hover:bg-surface-50 hover:text-foreground'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {isActive && (
                                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                                        )}
                                        <span className="truncate">{component.name}</span>
                                      </div>
                                      <span className="shrink-0 rounded bg-surface-200 px-1.5 py-0.5 text-[10px] text-muted group-hover:bg-surface-300">
                                        {component.variants.length}
                                      </span>
                                    </div>
                                  </button>

                                  {hasSubSections && variantGroups && isExpanded && (
                                    <div className="ml-2 mt-1 space-y-0.5 border-l border-brand-300 pl-2 transition-all duration-150">
                                      {Array.from(variantGroups.keys()).map((sectionKey) => {
                                        const sectionId = `${component.name.toLowerCase()}-${sectionKey}`
                                        const isSectionActive = activeSection === sectionId
                                        return (
                                          <button
                                            key={sectionKey}
                                            onClick={() => scrollToSection(component.name, sectionKey, category)}
                                            className={`group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition-colors ${
                                              isSectionActive
                                                ? 'bg-brand-100 text-brand-800 font-medium'
                                                : 'text-muted hover:bg-surface-50 hover:text-muted-foreground'
                                            }`}
                                          >
                                            <Hash className="h-2.5 w-2.5 shrink-0" />
                                            <span className="truncate">{getCategoryLabel(sectionKey)}</span>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  // Layouts navigation
                  <>
                    {/* Layout Components */}
                    {layoutCategories.map((category) => {
                      const categoryId = category.toLowerCase().replace(/\s+/g, '-')
                      const isExpanded = expandedCategories.has(category)
                      const categoryLayouts = layoutsByCategory[category] || []
                      const filteredCategoryLayouts = filteredLayouts.filter(l => categoryLayouts.includes(l))
                      const hasLayouts = filteredCategoryLayouts.length > 0
                      const isActive = activeId === categoryId

                      return (
                        <div key={category}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                scrollToCategory(category)
                                toggleCategory(category)
                              }}
                              className={`flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-brand-50 text-brand-700'
                                  : 'text-muted-foreground hover:bg-surface-50 hover:text-foreground'
                              }`}
                            >
                              <span className="truncate">{category}</span>
                              {hasLayouts && (
                                <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[10px] font-medium text-muted">
                                  {filteredCategoryLayouts.length}
                                </span>
                              )}
                            </button>
                            {hasLayouts && (
                              <button
                                onClick={() => toggleCategory(category)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-100"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>

                          {hasLayouts && isExpanded && (
                            <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-brand-200 pl-3">
                              {filteredCategoryLayouts.map((layout: LayoutEntry) => {
                                const layoutId = layout.id.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')
                                const isLayoutActive = activeId === layoutId

                                return (
                                  <button
                                    key={layout.id}
                                    onClick={() => scrollToLayout(layout.id)}
                                    className={`group block w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                      isLayoutActive
                                        ? 'bg-brand-50 text-brand-700 font-medium'
                                        : 'text-muted-foreground hover:bg-surface-50 hover:text-foreground'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {isLayoutActive && (
                                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                                        )}
                                        <span className="truncate">{layout.name}</span>
                                      </div>
                                      <span className="shrink-0 rounded bg-surface-200 px-1.5 py-0.5 text-[10px] text-muted group-hover:bg-surface-300">
                                        {layout.variants.length}
                                      </span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Page Patterns */}
                    {patternCategories.map((category) => {
                      const categoryId = category.toLowerCase().replace(/\s+/g, '-')
                      const isExpanded = expandedCategories.has(category)
                      const categoryPatterns = patternsByCategory[category] || []
                      const filteredCategoryPatterns = filteredPatterns.filter(p => categoryPatterns.includes(p))
                      const hasPatterns = filteredCategoryPatterns.length > 0
                      const isActive = activeId === categoryId

                      return (
                        <div key={category}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                scrollToCategory(category)
                                toggleCategory(category)
                              }}
                              className={`flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-brand-50 text-brand-700'
                                  : 'text-muted-foreground hover:bg-surface-50 hover:text-foreground'
                              }`}
                            >
                              <span className="truncate">{category}</span>
                              {hasPatterns && (
                                <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[10px] font-medium text-muted">
                                  {filteredCategoryPatterns.length}
                                </span>
                              )}
                            </button>
                            {hasPatterns && (
                              <button
                                onClick={() => toggleCategory(category)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-100"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>

                          {hasPatterns && isExpanded && (
                            <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-brand-200 pl-3">
                              {filteredCategoryPatterns.map((pattern: PagePatternEntry) => {
                                const patternId = pattern.id.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')
                                const isPatternActive = activeId === patternId

                                return (
                                  <button
                                    key={pattern.id}
                                    onClick={() => scrollToLayout(pattern.id)}
                                    className={`group block w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                      isPatternActive
                                        ? 'bg-brand-50 text-brand-700 font-medium'
                                        : 'text-muted-foreground hover:bg-surface-50 hover:text-foreground'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {isPatternActive && (
                                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                                        )}
                                        <span className="truncate">{pattern.name}</span>
                                      </div>
                                      <span className="shrink-0 rounded bg-surface-200 px-1.5 py-0.5 text-[10px] text-muted group-hover:bg-surface-300">
                                        {pattern.variants.length}
                                      </span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </nav>
            </div>

            <div className="mt-auto shrink-0 border-t border-default pt-4">
              <div className="rounded-lg bg-linear-to-br from-brand-50 to-surface-50 p-3 shadow-sm">
                <h4 className="text-brand-900 mb-2 flex items-center gap-2 text-xs font-semibold">
                  <div className="h-1 w-1 rounded-full bg-brand-600" />
                  Navigation Tips
                </h4>
                <ul className="text-brand-800 space-y-1.5 text-[11px] leading-relaxed">
                  <li>• Scroll progress shown at top</li>
                  <li>• Active {viewMode === 'components' ? 'component' : 'layout'} highlighted</li>
                  <li>• Click {viewMode === 'components' ? 'component' : 'layout'} to jump instantly</li>
                  {viewMode === 'components' && <li>• Sections shown for detailed components</li>}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
