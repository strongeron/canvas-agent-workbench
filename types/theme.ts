export interface ThemeToken {
  label: string
  cssVar: string
  category?: string
  subcategory?: string
  description?: string
}

export interface ThemeOption {
  id: string
  label: string
  description?: string
  vars?: Record<string, string>
  groupId?: string
}
