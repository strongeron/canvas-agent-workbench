import {
  NATIVE_COMPONENT_ELEMENT_PARTS,
  NATIVE_COMPONENT_LAYOUT_PRIMITIVES,
  NATIVE_COMPONENT_TEMPLATES,
  type NativeComponentTemplate,
} from "./canvasNativeComponentShell"

function toTemplateSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function suggestNativeTemplateForComponentName(name: string): NativeComponentTemplate {
  const slug = toTemplateSlug(name)
  const knownTemplateIds = new Set<NativeComponentTemplate>([
    ...NATIVE_COMPONENT_TEMPLATES.map((template) => template.id),
    ...NATIVE_COMPONENT_LAYOUT_PRIMITIVES,
    ...NATIVE_COMPONENT_ELEMENT_PARTS,
  ])
  return knownTemplateIds.has(slug as NativeComponentTemplate)
    ? (slug as NativeComponentTemplate)
    : "section"
}
