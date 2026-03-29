import { Columns2, Grid2x2, Type } from "lucide-react"

import {
  DESIGN_SYSTEM_ICON_KEYS,
  getDesignSystemIcon,
  getDesignSystemIconLibraryLabel,
  type DesignSystemIconKey,
} from "./iconLibraryRegistry"
import {
  Button as PrimitiveButton,
  Heading,
  Surface,
  Text,
} from "../../projects/design-system-foundation/components/ui"
import type { ColorCanvasNodePreview } from "../../types/colorCanvas"

interface DesignSystemNodePreviewProps {
  preview: ColorCanvasNodePreview
}

function CssVarBadge({ value }: { value?: string }) {
  if (!value) return null
  return (
    <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
      {value}
    </span>
  )
}

function formatPx(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "—"
  return `${Number(value.toFixed(value >= 100 ? 0 : 1))}px`
}

function PreviewMeta({ preview }: DesignSystemNodePreviewProps) {
  if (!preview.mappings?.length && !preview.code) return null

  return (
    <div className="mt-2 space-y-2">
      {preview.mappings && preview.mappings.length > 0 && (
        <div className="rounded-md border border-default bg-white">
          {preview.mappings.map((mapping) => (
            <div
              key={`${mapping.label}-${mapping.value}`}
              className="flex items-start justify-between gap-3 border-b border-default px-2 py-1 text-[10px] last:border-b-0"
            >
              <span className="text-muted-foreground">{mapping.label}</span>
              <span className="font-mono text-foreground">{mapping.value}</span>
            </div>
          ))}
        </div>
      )}
      {preview.code && (
        <pre className="max-h-40 overflow-auto rounded-md bg-white p-2 text-[10px] text-foreground">
          <code>{preview.code}</code>
        </pre>
      )}
    </div>
  )
}

function IconCell({
  iconLibraryId,
  iconKey,
  label,
  size,
  containerSize,
}: {
  iconLibraryId?: string
  iconKey: DesignSystemIconKey
  label?: string
  size: string
  containerSize?: string
}) {
  const Icon = getDesignSystemIcon(iconLibraryId, iconKey)

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 rounded-md border border-default bg-white px-2 py-2">
      <div
        className="inline-flex items-center justify-center rounded-full border border-default bg-surface-50 text-foreground"
        style={{
          width: containerSize || `calc(${size} * 1.35)`,
          height: containerSize || `calc(${size} * 1.35)`,
        }}
      >
        <Icon
          style={{
            width: size,
            height: size,
            strokeWidth: "var(--icon-stroke)",
          }}
        />
      </div>
      {label && <span className="truncate text-[10px] text-muted-foreground">{label}</span>}
    </div>
  )
}

function IconGallery({
  iconLibraryId,
  iconKeys,
  sizeVar,
}: {
  iconLibraryId?: string
  iconKeys?: string[]
  sizeVar?: string
}) {
  const keys = (iconKeys?.filter((key): key is DesignSystemIconKey =>
    DESIGN_SYSTEM_ICON_KEYS.includes(key as DesignSystemIconKey)
  ) || DESIGN_SYSTEM_ICON_KEYS)

  const iconSize = sizeVar ? `var(${sizeVar})` : "var(--icon-size-md)"

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((iconKey) => (
        <IconCell
          key={iconKey}
          iconLibraryId={iconLibraryId}
          iconKey={iconKey}
          label={iconKey}
          size={`calc(${iconSize} * 0.52)`}
        />
      ))}
    </div>
  )
}

function LayoutRecipePreview({
  direction,
  gapVar,
  paddingVar,
  columns,
  iconLibraryId,
}: {
  direction: "column" | "row" | "grid"
  gapVar?: string
  paddingVar?: string
  columns?: number
  iconLibraryId?: string
}) {
  const ActionIcon = getDesignSystemIcon(iconLibraryId, "action")
  const GridIcon = getDesignSystemIcon(iconLibraryId, "grid")
  const AccentIcon = getDesignSystemIcon(iconLibraryId, "accent")

  const gap = gapVar ? `var(${gapVar})` : "var(--space-200)"
  const padding = paddingVar ? `var(${paddingVar})` : "var(--space-300)"

  if (direction === "column") {
    return (
      <div className="w-full rounded-lg border border-default bg-surface-50" style={{ padding }}>
        <div className="flex flex-col" style={{ gap }}>
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-lg border border-default bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-default bg-surface-50 text-foreground">
                  <ActionIcon className="h-4 w-4" style={{ strokeWidth: "var(--icon-stroke)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <Heading as="h4">Stack item {index + 1}</Heading>
                  <Text size="sm" tone="muted">
                    Layout spacing, icon scale, and body copy stay on the same rhythm.
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (direction === "grid") {
    return (
      <div className="w-full rounded-lg border border-default bg-surface-50" style={{ padding }}>
        <div
          className="grid"
          style={{
            gap,
            gridTemplateColumns: `repeat(${columns ?? 3}, minmax(min(100%, 132px), 1fr))`,
          }}
        >
          {Array.from({ length: columns ?? 3 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-default bg-white p-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-default bg-surface-50 text-foreground">
                <GridIcon className="h-4 w-4" style={{ strokeWidth: "var(--icon-stroke)" }} />
              </div>
              <div className="mt-3">
                <Heading as="h4">Grid card</Heading>
                <Text size="sm" tone="muted">
                  Column count and spacing expose how the type scale breathes in repeated modules.
                </Text>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg border border-default bg-surface-50" style={{ padding }}>
      <div
        className="grid"
        style={{
          gap,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
        }}
      >
        <div className="rounded-lg border border-default bg-white p-4">
          <Text as="p" size="sm" weight="semibold" tone="brand">
            Flexible composition
          </Text>
          <div className="mt-3">
            <Heading as="h3">Layout, type, and icon scales move together.</Heading>
            <Text tone="muted">
              Resize this node and compare how spacing, line length, and icon weight hold together.
            </Text>
          </div>
          <div className="mt-4">
            <PrimitiveButton size="md">Open preview</PrimitiveButton>
          </div>
        </div>
        <div className="rounded-lg border border-default bg-white p-4">
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-default bg-surface-50 text-foreground">
            <AccentIcon
              style={{
                width: "var(--icon-size-xl)",
                height: "var(--icon-size-xl)",
                strokeWidth: "var(--icon-stroke)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function TypeScaleList({ preview }: DesignSystemNodePreviewProps) {
  if (!preview.scaleItems?.length) return null

  return (
    <div className="space-y-2">
      {preview.scaleItems.map((item) => (
        <div key={`${item.label}-${item.cssVar || item.iconKey || "scale"}`} className="rounded-md border border-default bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="font-semibold text-foreground">{item.label}</span>
            <span className="font-mono text-muted-foreground">
              {item.minPx ? `${Math.round(item.minPx)}-${Math.round(item.maxPx || item.minPx)}px` : item.cssVar || "—"}
            </span>
          </div>
          <div
            className="mt-1 text-foreground"
            style={{
              fontFamily: item.fontFamilyVar ? `var(${item.fontFamilyVar})` : "inherit",
              fontSize: item.cssVar ? `var(${item.cssVar})` : "1rem",
              lineHeight: item.secondaryVar ? `var(${item.secondaryVar})` : "1.4",
              fontWeight:
                item.fontFamilyVar === "--font-family-display"
                  ? "var(--font-weight-display)"
                  : "var(--font-weight-sans)",
            }}
          >
            {item.sampleText || "Scale sample"}
          </div>
        </div>
      ))}
    </div>
  )
}

function IconScaleList({ preview }: DesignSystemNodePreviewProps) {
  if (!preview.scaleItems?.length) return null

  return (
    <div className="space-y-2">
      {preview.scaleItems.map((item) => {
        const iconKey = (item.iconKey || "action") as DesignSystemIconKey
        const Icon = getDesignSystemIcon(preview.iconLibraryId, iconKey)
        return (
          <div
            key={`${item.label}-${item.cssVar || item.iconKey || "icon"}`}
            className="flex items-center justify-between gap-3 rounded-md border border-default bg-white px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="inline-flex items-center justify-center rounded-full border border-default bg-surface-50 text-foreground"
                style={{
                  width: item.cssVar ? `var(${item.cssVar})` : "24px",
                  height: item.cssVar ? `var(${item.cssVar})` : "24px",
                }}
              >
                <Icon
                  style={{
                    width: item.cssVar ? `calc(var(${item.cssVar}) * 0.52)` : "14px",
                    height: item.cssVar ? `calc(var(${item.cssVar}) * 0.52)` : "14px",
                    strokeWidth: "var(--icon-stroke)",
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-foreground">{item.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {item.pairedLabel || item.cssVar || "Icon scale"}
                </div>
              </div>
            </div>
            <div className="text-right text-[10px] font-mono text-muted-foreground">
              {item.minPx ? `${Math.round(item.minPx)}-${Math.round(item.maxPx || item.minPx)}px` : "—"}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ResponsiveCheckpointStrip({ preview }: DesignSystemNodePreviewProps) {
  if (!preview.viewportSamples?.length) return null

  return (
    <div className="grid gap-2 md:grid-cols-3">
      {preview.viewportSamples.map((sample) => (
        <div key={`${sample.label}-${sample.viewportPx}`} className="rounded-md border border-default bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="font-semibold text-foreground">{sample.label}</span>
            <span className="font-mono text-muted-foreground">{sample.viewportPx}px</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {sample.fontPx !== undefined && (
              <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[9px] text-muted-foreground">
                Type {formatPx(sample.fontPx)}
              </span>
            )}
            {sample.lineHeightPx !== undefined && (
              <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[9px] text-muted-foreground">
                Leading {formatPx(sample.lineHeightPx)}
              </span>
            )}
            {sample.iconPx !== undefined && (
              <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[9px] text-muted-foreground">
                Icon {formatPx(sample.iconPx)}
              </span>
            )}
            {sample.gapPx !== undefined && (
              <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[9px] text-muted-foreground">
                Gap {formatPx(sample.gapPx)}
              </span>
            )}
            {sample.paddingPx !== undefined && (
              <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[9px] text-muted-foreground">
                Pad {formatPx(sample.paddingPx)}
              </span>
            )}
            {sample.columns !== undefined && (
              <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[9px] text-muted-foreground">
                Cols {sample.columns}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function LayoutViewportGallery({
  preview,
  direction,
}: DesignSystemNodePreviewProps & { direction: "column" | "row" | "grid" }) {
  if (!preview.viewportSamples?.length) return null

  const ActionIcon = getDesignSystemIcon(preview.iconLibraryId, "action")
  const GridIcon = getDesignSystemIcon(preview.iconLibraryId, "grid")
  const AccentIcon = getDesignSystemIcon(preview.iconLibraryId, "accent")

  return (
    <div className="grid gap-2 md:grid-cols-3">
      {preview.viewportSamples.map((sample) => (
        <div key={`${sample.label}-${sample.viewportPx}`} className="rounded-md border border-default bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="font-semibold text-foreground">{sample.label}</span>
            <span className="font-mono text-muted-foreground">{sample.viewportPx}px</span>
          </div>
          <div className="mt-1 text-[9px] text-muted-foreground">
            {sample.gapPx !== undefined ? `gap ${formatPx(sample.gapPx)}` : "gap —"} ·{" "}
            {sample.paddingPx !== undefined ? `pad ${formatPx(sample.paddingPx)}` : "pad —"}
            {sample.columns !== undefined ? ` · cols ${sample.columns}` : ""}
          </div>
          <div
            className="mt-2 rounded-md border border-default bg-surface-50"
            style={{
              padding: sample.paddingPx ? `${sample.paddingPx}px` : "12px",
              fontSize: sample.fontPx ? `${sample.fontPx}px` : undefined,
              lineHeight: sample.lineHeightPx ? `${sample.lineHeightPx}px` : undefined,
            }}
          >
            {direction === "column" && (
              <div className="flex flex-col" style={{ gap: sample.gapPx ? `${sample.gapPx}px` : "12px" }}>
                {[0, 1].map((index) => (
                  <div key={index} className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-2">
                    <ActionIcon
                      style={{
                        width: sample.iconPx ? `${Math.max(sample.iconPx * 0.48, 12)}px` : "14px",
                        height: sample.iconPx ? `${Math.max(sample.iconPx * 0.48, 12)}px` : "14px",
                        strokeWidth: "var(--icon-stroke)",
                      }}
                    />
                    <span className="truncate text-[10px] text-foreground">Stack rhythm</span>
                  </div>
                ))}
              </div>
            )}
            {direction === "grid" && (
              <div
                className="grid"
                style={{
                  gap: sample.gapPx ? `${sample.gapPx}px` : "12px",
                  gridTemplateColumns: `repeat(${sample.columns || 1}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: sample.columns || 1 }).map((_, index) => (
                  <div key={index} className="rounded-md border border-default bg-white px-2 py-2">
                    <GridIcon
                      style={{
                        width: sample.iconPx ? `${Math.max(sample.iconPx * 0.42, 12)}px` : "14px",
                        height: sample.iconPx ? `${Math.max(sample.iconPx * 0.42, 12)}px` : "14px",
                        strokeWidth: "var(--icon-stroke)",
                      }}
                    />
                    <div className="mt-1 text-[10px] text-foreground">Card</div>
                  </div>
                ))}
              </div>
            )}
            {direction === "row" && (
              <div
                className="grid"
                style={{
                  gap: sample.gapPx ? `${sample.gapPx}px` : "12px",
                  gridTemplateColumns: `repeat(${sample.columns || 1}, minmax(0, 1fr))`,
                }}
              >
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="text-[10px] font-semibold text-foreground">Hero copy</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">Scale stays consistent.</div>
                </div>
                {(sample.columns || 1) > 1 && (
                  <div className="flex items-center justify-center rounded-md border border-default bg-white px-2 py-2 text-foreground">
                    <AccentIcon
                      style={{
                        width: sample.iconPx ? `${Math.max(sample.iconPx * 0.6, 16)}px` : "18px",
                        height: sample.iconPx ? `${Math.max(sample.iconPx * 0.6, 16)}px` : "18px",
                        strokeWidth: "var(--icon-stroke)",
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DesignSystemNodePreview({ preview }: DesignSystemNodePreviewProps) {
  switch (preview.kind) {
    case "connector-detail":
      return (
        <div className="mt-3 space-y-2">
          <div className="rounded-md border border-default bg-white px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">
              {preview.badge || "System logic"}
            </div>
            <div className="mt-1 text-[11px] leading-5 text-foreground">
              {preview.note || preview.description || "Explains how this step transforms tokens."}
            </div>
            {preview.tokens && preview.tokens.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {preview.tokens.slice(0, 4).map((token) => (
                  <CssVarBadge key={token} value={token} />
                ))}
              </div>
            )}
          </div>
          <PreviewMeta preview={preview} />
        </div>
      )

    case "font-family":
      return (
        <div className="mt-3 space-y-2 rounded-lg border border-default bg-surface-50 p-3">
          <div className="flex flex-wrap gap-1">
            <CssVarBadge value={preview.fontFamilyVar} />
            <CssVarBadge value={preview.cssVar} />
          </div>
          <p
            className="text-foreground"
            style={{
              fontFamily: preview.fontFamilyVar ? `var(${preview.fontFamilyVar})` : "inherit",
              fontSize: preview.cssVar ? `var(${preview.cssVar})` : "1rem",
              lineHeight: preview.secondaryVar ? `var(${preview.secondaryVar})` : "1.4",
              fontWeight:
                preview.fontFamilyVar === "--font-family-display"
                  ? "var(--font-weight-display)"
                  : "var(--font-weight-sans)",
            }}
          >
            {preview.sampleText || "Font metric preview"}
          </p>
          <ResponsiveCheckpointStrip preview={preview} />
          <TypeScaleList preview={preview} />
          <PreviewMeta preview={preview} />
        </div>
      )

    case "type-scale":
      return (
        <div className="mt-3 space-y-2 rounded-lg border border-default bg-surface-50 p-3">
          <div className="flex flex-wrap gap-1">
            <CssVarBadge value={preview.cssVar} />
            <CssVarBadge value={preview.secondaryVar} />
          </div>
          <p
            className="text-foreground"
            style={{
              fontFamily: preview.fontFamilyVar ? `var(${preview.fontFamilyVar})` : "inherit",
              fontSize: preview.cssVar ? `var(${preview.cssVar})` : "1rem",
              lineHeight: preview.secondaryVar ? `var(${preview.secondaryVar})` : "1.4",
              fontWeight:
                preview.fontFamilyVar === "--font-family-display"
                  ? "var(--font-weight-display)"
                  : "var(--font-weight-sans)",
            }}
          >
            {preview.sampleText || "Fluid type preview"}
          </p>
          {preview.note && <div className="text-[10px] text-muted-foreground">{preview.note}</div>}
          <ResponsiveCheckpointStrip preview={preview} />
          <TypeScaleList preview={preview} />
          <PreviewMeta preview={preview} />
        </div>
      )

    case "stroke-pair": {
      const ActionIcon = getDesignSystemIcon(preview.iconLibraryId, "action")
      return (
        <div className="mt-3 space-y-2 rounded-lg border border-default bg-surface-50 p-3">
          <div className="flex flex-wrap gap-1">
            <CssVarBadge value={preview.cssVar} />
            <CssVarBadge value={preview.fontFamilyVar} />
            <CssVarBadge value={preview.secondaryVar} />
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-2">
            <div
              className="inline-flex items-center justify-center rounded-full border border-default bg-surface-50 text-foreground"
              style={{
                width: preview.cssVar ? `var(${preview.cssVar})` : "24px",
                height: preview.cssVar ? `var(${preview.cssVar})` : "24px",
              }}
            >
              <ActionIcon
                style={{
                  width: preview.cssVar ? `calc(var(${preview.cssVar}) * 0.5)` : "14px",
                  height: preview.cssVar ? `calc(var(${preview.cssVar}) * 0.5)` : "14px",
                  strokeWidth: "var(--icon-stroke)",
                }}
              />
            </div>
            <span
              className="text-foreground"
              style={{
                fontFamily: preview.fontFamilyVar ? `var(${preview.fontFamilyVar})` : "inherit",
                fontSize: preview.secondaryVar ? `var(${preview.secondaryVar})` : "1rem",
                lineHeight: preview.paddingVar ? `var(${preview.paddingVar})` : "1.4",
                fontWeight: "var(--font-weight-sans)",
              }}
            >
              {preview.sampleText || "Stroke matched to body text"}
            </span>
          </div>
          <ResponsiveCheckpointStrip preview={preview} />
          <IconScaleList preview={preview} />
          <PreviewMeta preview={preview} />
        </div>
      )
    }

    case "icon-library":
      return (
        <div className="mt-3 space-y-2 rounded-lg border border-default bg-surface-50 p-3">
          <div className="flex flex-wrap gap-1">
            <CssVarBadge value={preview.cssVar} />
            <CssVarBadge value="--icon-stroke" />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {preview.note ||
              `${getDesignSystemIconLibraryLabel(preview.iconLibraryId)} is active for the current preview graph.`}
          </div>
          <IconGallery
            iconLibraryId={preview.iconLibraryId}
            iconKeys={preview.iconKeys}
            sizeVar={preview.cssVar}
          />
          <ResponsiveCheckpointStrip preview={preview} />
          <IconScaleList preview={preview} />
          <PreviewMeta preview={preview} />
        </div>
      )

    case "icon-scale":
      return (
        <div className="mt-3 space-y-2 rounded-lg border border-default bg-surface-50 p-3">
          <div className="flex flex-wrap gap-1">
            <CssVarBadge value="--icon-size-sm" />
            <CssVarBadge value={preview.cssVar} />
            <CssVarBadge value="--icon-size-lg" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <IconCell iconLibraryId={preview.iconLibraryId} iconKey="search" label="sm" size="calc(var(--icon-size-sm) * 0.52)" />
            <IconCell iconLibraryId={preview.iconLibraryId} iconKey="grid" label="md" size={`calc(${preview.cssVar ? `var(${preview.cssVar})` : "var(--icon-size-md)"} * 0.52)`} />
            <IconCell iconLibraryId={preview.iconLibraryId} iconKey="accent" label="lg" size="calc(var(--icon-size-lg) * 0.52)" />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {preview.note || "Container stays aligned to the paired text line height."}
          </div>
          <ResponsiveCheckpointStrip preview={preview} />
          <IconScaleList preview={preview} />
          <PreviewMeta preview={preview} />
        </div>
      )

    case "layout-stack":
      return (
        <div className="mt-3 space-y-2 rounded-lg border border-default bg-surface-50 p-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Type className="h-3.5 w-3.5" />
            <CssVarBadge value={preview.gapVar} />
            <CssVarBadge value={preview.paddingVar} />
          </div>
          <LayoutRecipePreview
            direction="column"
            gapVar={preview.gapVar}
            paddingVar={preview.paddingVar}
            iconLibraryId={preview.iconLibraryId}
          />
          <LayoutViewportGallery preview={preview} direction="column" />
          <PreviewMeta preview={preview} />
        </div>
      )

    case "layout-grid":
      return (
        <div className="mt-3 space-y-2 rounded-lg border border-default bg-surface-50 p-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Grid2x2 className="h-3.5 w-3.5" />
            <CssVarBadge value={preview.gapVar} />
            <CssVarBadge value={preview.paddingVar} />
          </div>
          <LayoutRecipePreview
            direction="grid"
            gapVar={preview.gapVar}
            paddingVar={preview.paddingVar}
            columns={preview.columns}
            iconLibraryId={preview.iconLibraryId}
          />
          <LayoutViewportGallery preview={preview} direction="grid" />
          <PreviewMeta preview={preview} />
        </div>
      )

    case "layout-split":
      return (
        <div className="mt-3 space-y-2 rounded-lg border border-default bg-surface-50 p-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Columns2 className="h-3.5 w-3.5" />
            <CssVarBadge value={preview.gapVar} />
            <CssVarBadge value={preview.paddingVar} />
          </div>
          <LayoutRecipePreview
            direction="row"
            gapVar={preview.gapVar}
            paddingVar={preview.paddingVar}
            iconLibraryId={preview.iconLibraryId}
          />
          <LayoutViewportGallery preview={preview} direction="row" />
          <PreviewMeta preview={preview} />
        </div>
      )

    case "token-standard":
      return (
        <div className="mt-3 rounded-lg border border-default bg-surface-50 p-3">
          <div className="text-[10px] text-muted-foreground">
            {preview.note || "DTCG-style token document generated from the live scale."}
          </div>
          <PreviewMeta preview={preview} />
        </div>
      )

    case "radix-theme":
      return (
        <div className="mt-3 rounded-lg border border-default bg-surface-50 p-3">
          <div className="text-[10px] text-muted-foreground">
            {preview.note || "Radix Themes variable bridge using ds-scale aliases."}
          </div>
          <PreviewMeta preview={preview} />
        </div>
      )

    case "primitive-text":
      return (
        <div className="mt-3 rounded-lg border border-default bg-surface-50 p-3">
          <Text size="base">{preview.sampleText || "Primitive text follows the live scale."}</Text>
          <PreviewMeta preview={preview} />
        </div>
      )

    case "primitive-heading":
      return (
        <div className="mt-3 rounded-lg border border-default bg-surface-50 p-3">
          <Heading as="h3">{preview.sampleText || "Display primitives stay in sync."}</Heading>
          <PreviewMeta preview={preview} />
        </div>
      )

    case "primitive-button":
      return (
        <div className="mt-3 rounded-lg border border-default bg-surface-50 p-3">
          <PrimitiveButton
            size={preview.size || "md"}
            variant={preview.variant || "primary"}
            fullWidth
          >
            {preview.sampleText || "Preview CTA"}
          </PrimitiveButton>
          <PreviewMeta preview={preview} />
        </div>
      )

    case "primitive-surface":
      return (
        <div className="mt-3 rounded-lg border border-default bg-surface-50 p-3">
          <Surface
            eyebrow="Canvas primitive"
            title={preview.sampleText || "Preview generated from live tokens"}
            description={preview.note || "Color, space, type, and radius all come from the active scale."}
          />
          <PreviewMeta preview={preview} />
        </div>
      )

    default:
      return null
  }
}
