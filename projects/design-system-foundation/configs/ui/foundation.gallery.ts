import {
  buttonSchema,
  childrenSchema,
  createPrimitiveGalleryEntry,
  pickSchema,
  type GalleryEntry,
} from "@/core"
import type {
  BoxProps,
  ButtonProps,
  HeadingProps,
  StackProps,
  SurfaceProps,
  TextProps,
} from "@project/design-system-foundation/components/ui"

function textControl(label: string, placeholder?: string) {
  return {
    type: "text" as const,
    label,
    placeholder,
  }
}

function booleanControl(label: string) {
  return {
    type: "boolean" as const,
    label,
  }
}

function selectControl(label: string, options: Array<{ value: string; label: string }>) {
  return {
    type: "select" as const,
    label,
    options,
  }
}

function radioControl(label: string, options: Array<{ value: string; label: string }>) {
  return {
    type: "radio" as const,
    label,
    options,
  }
}

const boxSchema = {
  children: {
    ...childrenSchema,
    type: "textarea" as const,
    placeholder: "Box content",
  },
  as: {
    type: "select" as const,
    label: "Element",
    options: [
      { value: "div", label: "div" },
      { value: "section", label: "section" },
      { value: "article", label: "article" },
      { value: "aside", label: "aside" },
    ],
  },
  padding: selectControl("Padding", [
    { value: "none", label: "None" },
    { value: "sm", label: "Small" },
    { value: "md", label: "Medium" },
    { value: "lg", label: "Large" },
    { value: "xl", label: "XL" },
  ]),
  surface: selectControl("Surface", [
    { value: "transparent", label: "Transparent" },
    { value: "subtle", label: "Subtle" },
    { value: "default", label: "Default" },
    { value: "brand", label: "Brand" },
    { value: "inverse", label: "Inverse" },
  ]),
  border: booleanControl("Border"),
  radius: selectControl("Radius", [
    { value: "none", label: "None" },
    { value: "sm", label: "Small" },
    { value: "md", label: "Medium" },
    { value: "lg", label: "Large" },
    { value: "xl", label: "XL" },
  ]),
  shadow: selectControl("Shadow", [
    { value: "none", label: "None" },
    { value: "sm", label: "Small" },
    { value: "md", label: "Medium" },
    { value: "card", label: "Card" },
  ]),
}

const stackSchema = {
  direction: radioControl("Direction", [
    { value: "vertical", label: "Vertical" },
    { value: "horizontal", label: "Horizontal" },
  ]),
  gap: selectControl("Gap", [
    { value: "none", label: "None" },
    { value: "xs", label: "XS" },
    { value: "sm", label: "Small" },
    { value: "md", label: "Medium" },
    { value: "lg", label: "Large" },
    { value: "xl", label: "XL" },
  ]),
  align: selectControl("Align", [
    { value: "start", label: "Start" },
    { value: "center", label: "Center" },
    { value: "end", label: "End" },
    { value: "stretch", label: "Stretch" },
  ]),
  justify: selectControl("Justify", [
    { value: "start", label: "Start" },
    { value: "center", label: "Center" },
    { value: "end", label: "End" },
    { value: "between", label: "Between" },
  ]),
  items: {
    type: "json" as const,
    label: "Items",
    description: "Array of fallback labels rendered by the stack preview.",
  },
}

const textSchema = {
  children: {
    ...childrenSchema,
    type: "textarea" as const,
    placeholder: "Body text",
  },
  as: selectControl("Element", [
    { value: "p", label: "Paragraph" },
    { value: "span", label: "Span" },
    { value: "label", label: "Label" },
    { value: "small", label: "Small" },
  ]),
  tone: selectControl("Tone", [
    { value: "default", label: "Default" },
    { value: "muted", label: "Muted" },
    { value: "brand", label: "Brand" },
    { value: "inverse", label: "Inverse" },
    { value: "error", label: "Error" },
  ]),
  size: selectControl("Size", [
    { value: "xs", label: "XS" },
    { value: "sm", label: "SM" },
    { value: "base", label: "Base" },
    { value: "lg", label: "LG" },
    { value: "xl", label: "XL" },
    { value: "2xl", label: "2XL" },
  ]),
  weight: selectControl("Weight", [
    { value: "regular", label: "Regular" },
    { value: "medium", label: "Medium" },
    { value: "semibold", label: "Semibold" },
    { value: "bold", label: "Bold" },
  ]),
  align: radioControl("Align", [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
  ]),
}

const headingSchema = {
  children: {
    ...childrenSchema,
    type: "textarea" as const,
    placeholder: "Heading text",
  },
  as: selectControl("Level", [
    { value: "h1", label: "H1" },
    { value: "h2", label: "H2" },
    { value: "h3", label: "H3" },
    { value: "h4", label: "H4" },
  ]),
  tone: selectControl("Tone", [
    { value: "default", label: "Default" },
    { value: "muted", label: "Muted" },
    { value: "brand", label: "Brand" },
    { value: "inverse", label: "Inverse" },
  ]),
  align: radioControl("Align", [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
  ]),
}

const surfaceSchema = {
  eyebrow: textControl("Eyebrow", "Surface eyebrow"),
  title: textControl("Title", "Surface title"),
  description: {
    type: "textarea" as const,
    label: "Description",
    placeholder: "Surface description",
  },
  ...pickSchema(boxSchema, ["padding", "radius", "shadow", "border"]),
  surface: selectControl("Surface", [
    { value: "subtle", label: "Subtle" },
    { value: "default", label: "Default" },
  ]),
}

const buttonVariants = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "ghost", label: "Ghost" },
  { value: "danger", label: "Danger" },
]

export const boxEntry: GalleryEntry<BoxProps> = createPrimitiveGalleryEntry<BoxProps>({
  id: "primitive/box",
  name: "Box",
  description: "A neutral surface wrapper with spacing, border, radius, and shadow controls.",
  category: "Foundation",
  importPath: "@project/design-system-foundation/components/ui/Box",
  exportName: "Box",
  layoutSize: "medium",
  canvas: {
    defaultSize: { width: 360, height: 220 },
    minSize: { width: 180, height: 120 },
    resizable: true,
  },
  primitive: {
    family: "layout",
    level: "primitive",
    htmlTag: "div",
    exportable: true,
    tokenUsage: ["--color-surface", "--color-foreground", "--color-border-default", "--radius"],
  },
  variants: [
    {
      name: "Default",
      description: "Neutral content container",
      status: "prod",
      category: "variant",
      props: {
        children: "Use Box as the low-level wrapper for every higher-order pattern.",
        padding: "lg",
        surface: "default",
        border: true,
        radius: "lg",
      },
    },
    {
      name: "Brand Callout",
      description: "Inverted emphasis surface",
      status: "prod",
      category: "variant",
      props: {
        as: "section",
        children: "Primitive surfaces can still create strong hierarchy when the token system is consistent.",
        padding: "xl",
        surface: "brand",
        border: false,
        radius: "xl",
        shadow: "card",
      },
    },
    {
      name: "Interactive",
      description: "Adjust layout container props",
      status: "prod",
      category: "interactive",
      interactiveSchema: boxSchema,
      props: {
        children: "Adjust padding, radius, and surface without leaving the canvas.",
        as: "div",
        padding: "lg",
        surface: "subtle",
        border: true,
        radius: "lg",
        shadow: "none",
      },
    },
  ],
})

export const stackEntry: GalleryEntry<StackProps> = createPrimitiveGalleryEntry<StackProps>({
  id: "primitive/stack",
  name: "Stack",
  description: "A flexible spacing primitive for vertical and horizontal arrangements.",
  category: "Foundation",
  importPath: "@project/design-system-foundation/components/ui/Stack",
  exportName: "Stack",
  layoutSize: "medium",
  canvas: {
    defaultSize: { width: 360, height: 240 },
    minSize: { width: 200, height: 140 },
    resizable: true,
  },
  primitive: {
    family: "layout",
    level: "primitive",
    htmlTag: "div",
    exportable: true,
    tokenUsage: ["--color-surface", "--color-border-default", "--radius"],
  },
  variants: [
    {
      name: "Vertical",
      description: "Default column flow",
      status: "prod",
      category: "variant",
      props: {
        direction: "vertical",
        gap: "md",
        items: ["Title block", "Support copy", "Primary action"],
      },
    },
    {
      name: "Horizontal",
      description: "Inline cluster of related actions",
      status: "prod",
      category: "variant",
      props: {
        direction: "horizontal",
        gap: "sm",
        align: "center",
        items: ["Design", "Build", "Measure"],
      },
    },
    {
      name: "Interactive",
      description: "Tune stack layout props",
      status: "prod",
      category: "interactive",
      interactiveSchema: stackSchema,
      props: {
        direction: "vertical",
        gap: "md",
        align: "stretch",
        justify: "start",
        items: ["Primitive", "Composite", "Pattern"],
      },
    },
  ],
})

export const textEntry: GalleryEntry<TextProps> = createPrimitiveGalleryEntry<TextProps>({
  id: "primitive/text",
  name: "Text",
  description: "Token-driven body copy primitive for UI and content surfaces.",
  category: "Foundation",
  importPath: "@project/design-system-foundation/components/ui/Text",
  exportName: "Text",
  layoutSize: "small",
  canvas: {
    defaultSize: { width: 320, height: 140 },
    minSize: { width: 180, height: 80 },
    resizable: true,
  },
  primitive: {
    family: "content",
    level: "primitive",
    htmlTag: "p",
    exportable: true,
    tokenUsage: ["--font-family-sans", "--font-size-base", "--color-foreground"],
  },
  variants: [
    {
      name: "Default",
      description: "Readable body copy",
      status: "prod",
      category: "variant",
      props: {
        children: "Good primitive text should adapt to theme tokens without rewriting component code.",
      },
    },
    {
      name: "Muted Meta",
      description: "Supportive UI copy",
      status: "prod",
      category: "variant",
      props: {
        as: "small",
        tone: "muted",
        size: "sm",
        children: "Updated 2 minutes ago",
      },
    },
    {
      name: "Interactive",
      description: "Adjust text props",
      status: "prod",
      category: "interactive",
      interactiveSchema: textSchema,
      props: {
        children: "Tune tone, weight, and size from the side panel.",
        tone: "default",
        size: "base",
        weight: "regular",
        align: "left",
      },
    },
  ],
})

export const headingEntry: GalleryEntry<HeadingProps> = createPrimitiveGalleryEntry<HeadingProps>({
  id: "primitive/heading",
  name: "Heading",
  description: "Display typography primitive backed by design tokens.",
  category: "Foundation",
  importPath: "@project/design-system-foundation/components/ui/Heading",
  exportName: "Heading",
  layoutSize: "small",
  canvas: {
    defaultSize: { width: 420, height: 180 },
    minSize: { width: 220, height: 100 },
    resizable: true,
  },
  primitive: {
    family: "content",
    level: "primitive",
    htmlTag: "h2",
    exportable: true,
    tokenUsage: ["--font-family-display", "--font-size-3xl", "--color-foreground"],
  },
  variants: [
    {
      name: "Hero",
      description: "Large hero statement",
      status: "prod",
      category: "variant",
      props: {
        as: "h1",
        children: "Make the primitive layer the system, not an afterthought.",
      },
    },
    {
      name: "Section",
      description: "Section heading",
      status: "prod",
      category: "variant",
      props: {
        as: "h3",
        tone: "brand",
        children: "Foundation first",
      },
    },
    {
      name: "Interactive",
      description: "Adjust heading props",
      status: "prod",
      category: "interactive",
      interactiveSchema: headingSchema,
      props: {
        as: "h2",
        children: "Try the display scale on canvas.",
        tone: "default",
        align: "left",
      },
    },
  ],
})

export const surfaceEntry: GalleryEntry<SurfaceProps> = createPrimitiveGalleryEntry<SurfaceProps>({
  id: "primitive/surface",
  name: "Surface",
  description: "A framed content block built from Box, Heading, and Text primitives.",
  category: "Foundation",
  importPath: "@project/design-system-foundation/components/ui/Surface",
  exportName: "Surface",
  layoutSize: "medium",
  canvas: {
    defaultSize: { width: 420, height: 280 },
    minSize: { width: 260, height: 180 },
    resizable: true,
  },
  primitive: {
    family: "feedback",
    level: "composite",
    htmlTag: "section",
    exportable: true,
    tokenUsage: ["--color-surface", "--color-border-default", "--shadow-card", "--radius-lg"],
  },
  variants: [
    {
      name: "Default",
      description: "Standard surfaced content block",
      status: "prod",
      category: "variant",
      props: {
        eyebrow: "Primitive Surface",
        title: "Group related content without leaving the design system.",
        description: "Surface is a lightweight composite built only from foundation primitives.",
      },
    },
    {
      name: "Subtle",
      description: "Low-contrast grouping container",
      status: "prod",
      category: "variant",
      props: {
        eyebrow: "Subtle framing",
        title: "Use reduced contrast for quieter hierarchy.",
        description: "The token layer, not hardcoded colors, should create visual hierarchy.",
        surface: "subtle",
        shadow: "none",
      },
    },
    {
      name: "Interactive",
      description: "Tune composite surface props",
      status: "prod",
      category: "interactive",
      interactiveSchema: surfaceSchema,
      props: {
        eyebrow: "Composite Primitive",
        title: "Primitives become useful when you can compose them immediately.",
        description: "This surface stays exportable because each layer still maps back to native DOM.",
        padding: "lg",
        radius: "lg",
        shadow: "card",
        surface: "default",
        border: true,
      },
    },
  ],
})

export const buttonEntry: GalleryEntry<ButtonProps> = createPrimitiveGalleryEntry<ButtonProps>({
  id: "primitive/button",
  name: "Button",
  description: "Action primitive for high-signal call-to-action states.",
  category: "Foundation",
  importPath: "@project/design-system-foundation/components/ui/Button",
  exportName: "Button",
  layoutSize: "small",
  canvas: {
    defaultSize: { width: 260, height: 120 },
    minSize: { width: 160, height: 80 },
    resizable: true,
  },
  primitive: {
    family: "control",
    level: "primitive",
    htmlTag: "button",
    exportable: true,
    tokenUsage: ["--color-brand-600", "--color-inverse", "--radius"],
  },
  variants: [
    {
      name: "Primary",
      description: "Default primary action",
      status: "prod",
      category: "variant",
      props: {
        children: "Launch board",
        variant: "primary",
        size: "md",
      },
    },
    {
      name: "Secondary",
      description: "Lower-emphasis action",
      status: "prod",
      category: "variant",
      props: {
        children: "Review tokens",
        variant: "secondary",
        size: "md",
      },
    },
    {
      name: "Interactive",
      description: "Adjust button props",
      status: "prod",
      category: "interactive",
      interactiveSchema: {
        ...buttonSchema(buttonVariants),
        fullWidth: booleanControl("Full width"),
      },
      props: {
        children: "Generate primitives",
        variant: "primary",
        size: "md",
        fullWidth: false,
      },
    },
  ],
})
