/**
 * Gallery Standalone Demo - App
 *
 * This demonstrates how to set up the component gallery system.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import { Toaster, toast } from "sonner"

import {
  GalleryProvider,
  createStaticAdapter,
  importPaperSelection,
  type GalleryEntry,
  type PaperMcpClient,
} from "../core"

import {
  CanvasTab,
  PortableComponentRenderer,
  PortableGalleryPage as GalleryPage,
} from "../components"

// Demo Components
import { Button, type ButtonProps } from "./components/Button"
import { Badge, type BadgeProps } from "./components/Badge"
import { Input, type InputProps } from "./components/Input"
import { Card, type CardProps } from "./components/Card"
import { Modal, type ModalProps } from "./components/Modal"
import { Select, type SelectProps } from "./components/Select"
import { Tooltip } from "./components/Tooltip"
import { projectPacks } from "../projects/pack"

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

const buttonEntry: GalleryEntry<ButtonProps> = {
  id: "ui/button",
  name: "Button",
  category: "Base UI",
  importPath: "@/components/Button",
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
      name: "Ghost",
      description: "Minimal button without background",
      props: { variant: "ghost", children: "View Details" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Destructive",
      description: "Dangerous/destructive action",
      props: { variant: "destructive", children: "Delete" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Loading State",
      description: "Button with loading indicator",
      props: { variant: "primary", children: "Saving...", isLoading: true },
      status: "prod",
      category: "state",
    },
    {
      name: "Disabled State",
      description: "Button in disabled state",
      props: { variant: "primary", children: "Disabled", disabled: true },
      status: "prod",
      category: "state",
    },
    {
      name: "Interactive",
      description: "Try different combinations",
      props: { variant: "primary", size: "md", children: "Click Me" },
      status: "prod",
      category: "interactive",
      interactiveSchema: {
        variant: {
          type: "select",
          label: "Variant",
          options: [
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Secondary" },
            { value: "outline", label: "Outline" },
            { value: "ghost", label: "Ghost" },
            { value: "destructive", label: "Destructive" },
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
        isLoading: {
          type: "boolean",
          label: "Loading",
        },
        fullWidth: {
          type: "boolean",
          label: "Full Width",
        },
        children: {
          type: "text",
          label: "Label",
          placeholder: "Button text",
        },
      },
    },
  ],
}

const badgeEntry: GalleryEntry<BadgeProps> = {
  id: "ui/badge",
  name: "Badge",
  category: "Base UI",
  importPath: "@/components/Badge",
  layoutSize: "small",
  variants: [
    {
      name: "Default",
      description: "Neutral badge for general labels",
      props: { variant: "default", children: "Default" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Success",
      description: "Positive status indicator",
      props: { variant: "success", children: "Active" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Warning",
      description: "Caution or pending status",
      props: { variant: "warning", children: "Pending" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Error",
      description: "Error or failed status",
      props: { variant: "error", children: "Failed" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Info",
      description: "Informational badge",
      props: { variant: "info", children: "New" },
      status: "prod",
      category: "variant",
    },
    {
      name: "Interactive",
      description: "Try different combinations",
      props: { variant: "default", size: "md", children: "Badge" },
      status: "prod",
      category: "interactive",
      interactiveSchema: {
        variant: {
          type: "select",
          label: "Variant",
          options: [
            { value: "default", label: "Default" },
            { value: "success", label: "Success" },
            { value: "warning", label: "Warning" },
            { value: "error", label: "Error" },
            { value: "info", label: "Info" },
          ],
        },
        size: {
          type: "radio",
          label: "Size",
          options: [
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
          ],
        },
        children: {
          type: "text",
          label: "Text",
          placeholder: "Badge text",
        },
      },
    },
  ],
}

const inputEntry: GalleryEntry<InputProps> = {
  id: "ui/input",
  name: "Input",
  category: "Form Elements",
  importPath: "@/components/Input",
  layoutSize: "medium",
  variants: [
    {
      name: "Default",
      description: "Basic text input",
      props: { placeholder: "Enter your name..." },
      status: "prod",
      category: "variant",
    },
    {
      name: "With Label",
      description: "Input with label",
      props: { label: "Email", placeholder: "you@example.com", type: "email" },
      status: "prod",
      category: "variant",
    },
    {
      name: "With Hint",
      description: "Input with helper text",
      props: {
        label: "Password",
        type: "password",
        placeholder: "••••••••",
        hint: "Must be at least 8 characters",
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "Error State",
      description: "Input showing validation error",
      props: {
        label: "Email",
        placeholder: "you@example.com",
        error: "Please enter a valid email address",
        defaultValue: "invalid-email",
      },
      status: "prod",
      category: "state",
    },
    {
      name: "Disabled",
      description: "Input in disabled state",
      props: {
        label: "Username",
        defaultValue: "johndoe",
        disabled: true,
      },
      status: "prod",
      category: "state",
    },
  ],
}

const cardEntry: GalleryEntry<CardProps> = {
  id: "ui/card",
  name: "Card",
  category: "Layout",
  importPath: "@/components/Card",
  layoutSize: "medium",
  variants: [
    {
      name: "Default",
      description: "Basic card with border",
      props: {
        title: "Card Title",
        description: "This is a description of the card content.",
        children: "Card body content goes here.",
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "Bordered",
      description: "Card with stronger border",
      props: {
        variant: "bordered",
        title: "Bordered Card",
        description: "A card with a more prominent border.",
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "Elevated",
      description: "Card with shadow",
      props: {
        variant: "elevated",
        title: "Elevated Card",
        description: "A card with shadow for depth.",
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "Interactive",
      description: "Try different combinations",
      props: {
        variant: "default",
        padding: "md",
        title: "Interactive Card",
        description: "Adjust the props below.",
      },
      status: "prod",
      category: "interactive",
      interactiveSchema: {
        variant: {
          type: "select",
          label: "Variant",
          options: [
            { value: "default", label: "Default" },
            { value: "bordered", label: "Bordered" },
            { value: "elevated", label: "Elevated" },
          ],
        },
        padding: {
          type: "radio",
          label: "Padding",
          options: [
            { value: "none", label: "None" },
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
          ],
        },
        title: {
          type: "text",
          label: "Title",
          placeholder: "Card title",
        },
        description: {
          type: "text",
          label: "Description",
          placeholder: "Card description",
        },
      },
    },
  ],
}

const modalEntry: GalleryEntry<ModalProps> = {
  id: "ui/modal",
  name: "Modal",
  category: "Overlay",
  importPath: "@/components/Modal",
  layoutSize: "large",
  isModal: true,
  variants: [
    {
      name: "Default",
      description: "Basic modal dialog",
      props: {
        isOpen: true,
        title: "Confirm Action",
        children: "Are you sure you want to continue? This action cannot be undone.",
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "Small Modal",
      description: "Compact modal for simple confirmations",
      props: {
        isOpen: true,
        title: "Quick Confirm",
        size: "sm",
        children: "Delete this item?",
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "Large Modal",
      description: "Larger modal for complex content",
      props: {
        isOpen: true,
        title: "Settings",
        size: "lg",
        children: "Configure your preferences and options here.",
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "Interactive",
      description: "Try different modal configurations",
      props: {
        isOpen: true,
        title: "Modal Title",
        size: "md",
        showCloseButton: true,
      },
      status: "prod",
      category: "interactive",
      interactiveSchema: {
        title: {
          type: "text",
          label: "Title",
          placeholder: "Modal title",
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
        showCloseButton: {
          type: "boolean",
          label: "Show Close Button",
        },
      },
    },
  ],
}

const selectEntry: GalleryEntry<SelectProps> = {
  id: "ui/select",
  name: "Select",
  category: "Form Elements",
  importPath: "@/components/Select",
  layoutSize: "medium",
  allowOverflow: true, // Important: dropdown needs to overflow container
  variants: [
    {
      name: "Default",
      description: "Basic select dropdown",
      props: { placeholder: "Select an option..." },
      status: "prod",
      category: "variant",
    },
    {
      name: "With Label",
      description: "Select with label",
      props: {
        label: "Country",
        placeholder: "Choose a country...",
        options: [
          { value: "us", label: "United States" },
          { value: "ca", label: "Canada" },
          { value: "uk", label: "United Kingdom" },
          { value: "au", label: "Australia" },
        ],
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "With Selection",
      description: "Select with a value selected",
      props: {
        label: "Favorite Color",
        value: "blue",
        options: [
          { value: "red", label: "Red" },
          { value: "green", label: "Green" },
          { value: "blue", label: "Blue" },
          { value: "yellow", label: "Yellow" },
        ],
      },
      status: "prod",
      category: "variant",
    },
    {
      name: "Error State",
      description: "Select showing validation error",
      props: {
        label: "Required Field",
        placeholder: "Select...",
        error: "This field is required",
      },
      status: "prod",
      category: "state",
    },
    {
      name: "Disabled",
      description: "Disabled select",
      props: {
        label: "Disabled Select",
        placeholder: "Cannot select...",
        disabled: true,
      },
      status: "prod",
      category: "state",
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTER SETUP
// ─────────────────────────────────────────────────────────────────────────────

const demoEntries = [buttonEntry, badgeEntry, inputEntry, cardEntry, modalEntry, selectEntry]

const demoComponentMap = {
  Button,
  Badge,
  Input,
  Card,
  Modal,
  Select,
}

function CanvasButton({
  variant,
  size,
  className,
  disabled,
  onClick,
  children,
}: {
  variant?: "ghost" | "brand" | "outline" | "destructive" | string
  size?: "sm" | "md" | "lg" | string
  className?: string
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  const mappedVariant: ButtonProps["variant"] =
    variant === "brand"
      ? "primary"
      : variant === "outline"
        ? "outline"
        : variant === "ghost"
          ? "ghost"
          : variant === "destructive"
            ? "destructive"
            : "secondary"

  const mappedSize: ButtonProps["size"] =
    size === "sm" ? "sm" : size === "lg" ? "lg" : "md"

  return (
    <Button
      variant={mappedVariant}
      size={mappedSize}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function getPaperMcpClient(): PaperMcpClient | null {
  if (typeof window === "undefined") return null
  const anyWindow = window as unknown as {
    paperMcp?: PaperMcpClient
    mcp?: { paper?: PaperMcpClient }
    __paperMcp?: PaperMcpClient
  }
  return anyWindow.paperMcp || anyWindow.__paperMcp || anyWindow.mcp?.paper || null
}

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────

type ProjectId = string

function App() {
  const [view, setView] = useState<"gallery" | "canvas">("canvas")
  const [searchQuery, setSearchQuery] = useState("")
  const [projectId, setProjectId] = useState<ProjectId>("demo")
  const [thicketPack, setThicketPack] = useState<null | {
    id: string
    label: string
    entries: GalleryEntry[]
    layouts?: any[]
    patterns?: any[]
    componentMap: Record<string, React.ComponentType<any>>
    ui: { Button: React.ComponentType<any>; Tooltip: React.ComponentType<any> }
  }>(null)
  const [isThicketLoading, setIsThicketLoading] = useState(false)

  useEffect(() => {
    if (projectId !== "thicket" || thicketPack || isThicketLoading) return
    setIsThicketLoading(true)
    import("../demo-thicket/pack")
      .then((mod) => {
        setThicketPack(mod.thicketPack)
      })
      .finally(() => setIsThicketLoading(false))
  }, [projectId, thicketPack, isThicketLoading])

  const demoPack = useMemo(
    () => ({
      id: "demo",
      label: "Demo",
      entries: demoEntries,
      layouts: [],
      patterns: [],
      componentMap: demoComponentMap,
      ui: { Button: CanvasButton, Tooltip },
    }),
    []
  )

  const projectPackList = useMemo(
    () =>
      projectPacks.map((pack) => ({
        ...pack,
        ui: { Button: CanvasButton, Tooltip },
      })),
    []
  )

  const projectIds = useMemo(() => projectPackList.map((pack) => pack.id), [projectPackList])

  const projectOptions = useMemo(
    () => [
      { id: "demo", label: "Demo" },
      { id: "thicket", label: "Thicket" },
      ...projectPackList.map((pack) => ({ id: pack.id, label: pack.label })),
    ],
    [projectPackList]
  )

  const activePack =
    projectId === "demo"
      ? demoPack
      : projectId === "thicket"
        ? thicketPack
        : projectPackList.find((pack) => pack.id === projectId)

  const adapter = useMemo(() => {
    if (!activePack) return null
    return createStaticAdapter({
      componentMap: activePack.componentMap,
      entries: activePack.entries,
      layouts: activePack.layouts,
      patterns: activePack.patterns,
    })
  }, [activePack])

  const handleCreateProject = useCallback(async () => {
    const label = window.prompt("Project name")
    if (!label) return

    const response = await fetch("/api/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: label, label }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.projectId) {
      alert(data.error || "Failed to create project.")
      return
    }

    setProjectId(data.projectId)
    window.location.reload()
  }, [])

  const handleImportFromPaper = useCallback(
    async ({
      projectId: targetProjectId,
      kind,
    }: {
      projectId?: string
      artboardId?: string | null
      kind?: "ui" | "page"
    }) => {
      const selectedProjectId = targetProjectId || projectId
      if (!selectedProjectId || !projectIds.includes(selectedProjectId)) {
        toast.error("Select a project pack before importing from Paper.")
        return null
      }

      const client = getPaperMcpClient()
      if (!client) {
        toast.error("Paper MCP client not available in this environment.")
        return null
      }

      const toastId = toast.loading("Importing from Paper...")

      const basicInfo = await client.getBasicInfo().catch(() => ({}))
      const selection = await importPaperSelection(client, { format: "tailwind" })
      const importKind = kind === "page" ? "page" : "ui"
      const importedAt = new Date().toISOString().split("T")[0]
      const response = await fetch("/api/paper/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          name: selection.name,
          jsx: selection.jsx,
          kind: importKind,
          source: {
            fileName: (basicInfo as { fileName?: string }).fileName,
            pageName: (basicInfo as { pageName?: string }).pageName,
            nodeId: selection.nodeId,
            importedAt,
          },
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.componentId) {
        toast.error(data.error || "Paper import failed.", { id: toastId })
        return null
      }

      if (data.reload) {
        toast.success("Imported from Paper. Reloading...", { id: toastId })
        window.setTimeout(() => window.location.reload(), 600)
      } else {
        toast.success("Imported from Paper.", { id: toastId })
      }

      const size =
        selection.width && selection.height
          ? { width: selection.width, height: selection.height }
          : undefined

      return {
        componentId: data.componentId as string,
        variantIndex: 0,
        size,
        queueItem: {
          id: `${data.componentId}-${Date.now()}`,
          name: selection.name,
          componentId: data.componentId as string,
          projectId: selectedProjectId,
          kind: importKind,
          importedAt,
          source: {
            fileName: (basicInfo as { fileName?: string }).fileName,
            pageName: (basicInfo as { pageName?: string }).pageName,
            nodeId: selection.nodeId,
          },
        },
      }
    },
    [projectId, projectIds]
  )

  if (!adapter || !activePack) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-600">
        Loading {projectId === "thicket" ? "Thicket" : "Project"} components...
      </div>
    )
  }

  return (
    <GalleryProvider adapter={adapter}>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen flex-col bg-white">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px]">
              <h1 className="text-sm font-semibold text-gray-900">Component Gallery Demo</h1>
              <p className="text-xs text-gray-500">Switch between gallery and canvas</p>
            </div>

            {view === "gallery" && (
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search components..."
                  className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            )}

            <div className="ml-auto flex items-center gap-3">
              <div className="flex rounded-md border border-gray-200 bg-white p-0.5 text-xs font-semibold">
                {(["demo", "thicket"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setProjectId(id)}
                    disabled={id === "thicket" && isThicketLoading}
                    className={`rounded px-2.5 py-1 transition-colors ${
                      projectId === id
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {id === "demo" ? "Demo" : "Thicket"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setView("gallery")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  view === "gallery"
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Gallery
              </button>
              <button
                type="button"
                onClick={() => setView("canvas")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  view === "canvas"
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Canvas
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 pt-14">
          {view === "gallery" ? (
            <GalleryPage
              title="Component Gallery"
              description="A portable component gallery demo - browse and interact with all components"
              externalSearchQuery={searchQuery}
              onExternalSearchChange={setSearchQuery}
              showSearch={false}
              forceCompactHeader
              stickyHeader={false}
              headerOffset={64}
            />
          ) : (
            <CanvasTab
              Renderer={PortableComponentRenderer}
              getComponentById={(id) => {
                const entry = adapter.getEntryById(id)
                if (!entry || entry.kind === "layout" || entry.kind === "page-pattern") return null
                return entry as GalleryEntry
              }}
              entries={activePack.entries}
              Button={activePack.ui.Button}
              Tooltip={activePack.ui.Tooltip}
              storageKey={`gallery-${projectId}`}
              projects={projectOptions}
              activeProjectId={projectId}
              onSelectProject={(id) => setProjectId(id as ProjectId)}
              onCreateProject={handleCreateProject}
              onImportFromPaper={handleImportFromPaper}
            />
          )}
        </div>
      </div>
    </GalleryProvider>
  )
}

export default App
