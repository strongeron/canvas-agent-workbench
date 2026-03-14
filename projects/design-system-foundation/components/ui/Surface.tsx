import { Box, type BoxPadding, type BoxRadius, type BoxShadow, type BoxSurface } from "./Box"
import { Heading } from "./Heading"
import { Text } from "./Text"

export interface SurfaceProps {
  eyebrow?: string
  title?: string
  description?: string
  padding?: BoxPadding
  radius?: BoxRadius
  shadow?: BoxShadow
  surface?: Exclude<BoxSurface, "brand" | "inverse">
  border?: boolean
}

export function Surface({
  eyebrow = "Primitive Surface",
  title = "Compose higher-order sections from stable building blocks.",
  description = "Use this as the default framed container for grouped content and controls.",
  padding = "lg",
  radius = "lg",
  shadow = "card",
  surface = "default",
  border = true,
}: SurfaceProps) {
  return (
    <Box
      padding={padding}
      radius={radius}
      shadow={shadow}
      surface={surface}
      border={border}
      className="space-y-3"
    >
      <Text as="p" size="sm" weight="semibold" tone="brand">
        {eyebrow}
      </Text>
      <Heading as="h3">{title}</Heading>
      <Text tone="muted">{description}</Text>
    </Box>
  )
}
