/**
 * Gallery POC - Basic Setup Example
 *
 * This example shows how to integrate the portable gallery system
 * into your own project. Follow these steps:
 *
 * 1. Define your components
 * 2. Create gallery configs for each component
 * 3. Create an adapter with your component map
 * 4. Wrap your app with GalleryProvider
 * 5. Use the gallery components
 */

import { useState } from "react"

// Step 1: Import from gallery-poc core
import {
  GalleryProvider,
  createStaticAdapter,
  type GalleryEntry,
  type ComponentVariant,
} from "../core"

// Step 2: Import the portable renderer
import { PortableComponentRenderer } from "../components"

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE COMPONENTS (Replace with your own)
// ─────────────────────────────────────────────────────────────────────────────

// A simple Button component
interface ButtonProps {
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}

function Button({
  variant = "primary",
  size = "md",
  children,
  disabled,
  onClick,
}: ButtonProps) {
  const baseStyles = "rounded-lg font-medium transition-colors"

  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  }

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// A simple Badge component
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error"
  children: React.ReactNode
}

function Badge({ variant = "default", children }: BadgeProps) {
  const variantStyles = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

const buttonGalleryEntry: GalleryEntry<ButtonProps> = {
  id: "ui/button",
  name: "Button",
  category: "Base UI",
  importPath: "@/components/ui/button",
  layoutSize: "small",
  variants: [
    {
      name: "Primary",
      description: "Main call-to-action button",
      props: { variant: "primary", children: "Get Started" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Secondary",
      description: "Secondary actions",
      props: { variant: "secondary", children: "Learn More" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Outline",
      description: "Subtle button for tertiary actions",
      props: { variant: "outline", children: "Cancel" },
      status: "prod",
      category: "variant",
    },
    {
      name: "All Sizes",
      description: "Button size comparison",
      props: { variant: "primary", size: "md", children: "Click Me" },
      status: "prod",
      category: "size",
      interactiveSchema: {
        variant: {
          type: "select",
          label: "Variant",
          options: [
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Secondary" },
            { value: "outline", label: "Outline" },
          ],
        },
        size: {
          type: "radio",
          label: "Size",
          options: [
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
          ],
        },
        disabled: {
          type: "boolean",
          label: "Disabled",
        },
        children: {
          type: "text",
          label: "Label",
          placeholder: "Button text",
        },
      },
    },
    {
      name: "Disabled State",
      description: "Button in disabled state",
      props: { variant: "primary", children: "Disabled", disabled: true },
      status: "prod",
      category: "state",
    },
  ],
}

const badgeGalleryEntry: GalleryEntry<BadgeProps> = {
  id: "ui/badge",
  name: "Badge",
  category: "Base UI",
  importPath: "@/components/ui/badge",
  layoutSize: "small",
  variants: [
    {
      name: "Default",
      description: "Neutral badge",
      props: { variant: "default", children: "Default" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Success",
      description: "Success/positive badge",
      props: { variant: "success", children: "Active" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Warning",
      description: "Warning/caution badge",
      props: { variant: "warning", children: "Pending" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Error",
      description: "Error/negative badge",
      props: { variant: "error", children: "Failed" },
      status: "prod",
      category: "variant",
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTER SETUP
// ─────────────────────────────────────────────────────────────────────────────

// Create the adapter with your components and configs
const adapter = createStaticAdapter({
  // Map component names to React components
  componentMap: {
    Button,
    Badge,
  },
  // All gallery entries
  entries: [buttonGalleryEntry, badgeGalleryEntry],
})

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE GALLERY PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function BasicGalleryExample() {
  const [selectedEntry, setSelectedEntry] = useState(buttonGalleryEntry)
  const entries = adapter.getAllEntries()

  return (
    <GalleryProvider adapter={adapter}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Component Gallery</h1>
          <p className="text-gray-500">Browse and interact with your components</p>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <nav className="w-64 border-r border-gray-200 bg-white p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">
              Components
            </h2>
            <ul className="space-y-1">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    onClick={() => setSelectedEntry(entry as GalleryEntry)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedEntry.id === entry.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {entry.name}
                    <span className="ml-2 text-xs text-gray-400">
                      ({entry.variants.length})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{selectedEntry.name}</h2>
              <p className="text-gray-500">{selectedEntry.importPath}</p>
            </div>

            {/* Variants Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {selectedEntry.variants.map((variant, index) => (
                <PortableComponentRenderer
                  key={`${selectedEntry.id}-${index}`}
                  componentName={selectedEntry.name}
                  importPath={selectedEntry.importPath}
                  variant={variant}
                  renderMode="card"
                  backgroundColor="white"
                />
              ))}
            </div>
          </main>
        </div>
      </div>
    </GalleryProvider>
  )
}

export default BasicGalleryExample
