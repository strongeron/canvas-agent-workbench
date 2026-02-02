import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { ReactNode } from "react"

import { Skeleton } from "@thicket/components/ui/skeleton"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@thicket/components/ui/table"
import { cn } from "@thicket/lib/utils"

export type SortDirection = "asc" | "desc"

export interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  renderCell?: (row: T) => ReactNode
  renderHeader?: () => ReactNode
  className?: string
  responsive?: string
  align?: "left" | "right" | "center"
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  sortField?: keyof T
  sortDirection?: SortDirection
  onSortChange: (field: keyof T, direction: SortDirection) => void
  rowKey: (row: T) => string | number
  onRowClick?: (row: T, event: React.MouseEvent) => void
  renderActions?: (row: T) => ReactNode
  emptyState?: ReactNode
  loading?: boolean
  minWidth?: string
  className?: string
  wrapperClassName?: string
  skeletonRows?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Sort Icon Component
// ─────────────────────────────────────────────────────────────────────────────

interface SortIconProps {
  field: string
  currentField?: string
  direction?: SortDirection
}

function SortIcon({ field, currentField, direction }: SortIconProps) {
  if (currentField !== field) {
    return <ArrowUpDown className="text-muted h-4 w-4" />
  }
  return direction === "asc" ? (
    <ArrowUp className="text-brand-600 h-4 w-4" />
  ) : (
    <ArrowDown className="text-brand-600 h-4 w-4" />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Table Header Component
// ─────────────────────────────────────────────────────────────────────────────

interface DataTableHeaderProps<T> {
  columns: Column<T>[]
  sortField?: keyof T
  sortDirection?: SortDirection
  onSort: (field: keyof T) => void
  hasActions: boolean
}

function DataTableHeader<T>({
  columns,
  sortField,
  sortDirection,
  onSort,
  hasActions,
}: DataTableHeaderProps<T>) {
  const getAriaSort = (
    column: Column<T>,
  ): "ascending" | "descending" | "none" | undefined => {
    if (!column.sortable) return undefined
    if (sortField !== column.key) return "none"
    return sortDirection === "asc" ? "ascending" : "descending"
  }

  return (
    <TableHeader id="table-header">
      <tr>
        {columns.map((column) => (
          <TableHead
            key={String(column.key)}
            className={cn(column.className, column.responsive)}
            aria-sort={getAriaSort(column)}
          >
            {column.sortable ? (
              <button
                onClick={() => onSort(column.key)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase transition-colors lg:text-sm"
              >
                {column.renderHeader?.() ?? column.label}
                <SortIcon
                  field={String(column.key)}
                  currentField={sortField ? String(sortField) : undefined}
                  direction={sortDirection}
                />
              </button>
            ) : (
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase lg:text-sm">
                {column.renderHeader?.() ?? column.label}
              </span>
            )}
          </TableHead>
        ))}
        {hasActions && (
          <TableHead className="text-right">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase lg:text-sm">
              Actions
            </span>
          </TableHead>
        )}
      </tr>
    </TableHeader>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Table Body Component
// ─────────────────────────────────────────────────────────────────────────────

interface DataTableBodyProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T, event: React.MouseEvent) => void
  renderActions?: (row: T) => ReactNode
  loading?: boolean
  skeletonRows: number
}

function DataTableBody<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  renderActions,
  loading,
  skeletonRows,
}: DataTableBodyProps<T>) {
  return (
    <TableBody id="table-body">
      {data.map((row) => (
        <TableRow
          key={rowKey(row)}
          onClick={onRowClick ? (e) => onRowClick(row, e) : undefined}
          className={cn(
            "transition-colors hover:bg-gray-50/50",
            onRowClick && "cursor-pointer",
            loading && "pointer-events-none opacity-50",
          )}
        >
          {columns.map((column) => (
            <TableCell
              key={String(column.key)}
              className={cn(
                column.className,
                column.responsive,
                column.align === "right" && "text-right",
                column.align === "center" && "text-center",
              )}
            >
              {column.renderCell?.(row) ?? String(row[column.key] ?? "")}
            </TableCell>
          ))}
          {renderActions && (
            <TableCell className="text-right">{renderActions(row)}</TableCell>
          )}
        </TableRow>
      ))}

      {/* Skeleton rows for initial loading with no data */}
      {loading &&
        data.length === 0 &&
        Array.from({ length: skeletonRows }).map((_, index) => (
          <TableRow key={`skeleton-${index}`}>
            {columns.map((column) => (
              <TableCell
                key={String(column.key)}
                className={cn(column.className, column.responsive)}
              >
                <Skeleton className="h-5 w-full" />
              </TableCell>
            ))}
            {renderActions && (
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-8 w-20" />
              </TableCell>
            )}
          </TableRow>
        ))}
    </TableBody>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Overlay Component
// ─────────────────────────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
      <div className="text-muted-foreground flex items-center gap-2">
        <svg
          className="h-5 w-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium">Loading...</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DataTable Component
// ─────────────────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  sortField,
  sortDirection,
  onSortChange,
  rowKey,
  onRowClick,
  renderActions,
  emptyState,
  loading,
  minWidth = "min-w-[800px]",
  className,
  wrapperClassName,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const handleSort = (field: keyof T) => {
    const newDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc"
    onSortChange(field, newDirection)
  }

  const isEmpty = data.length === 0 && !loading

  if (emptyState && isEmpty) {
    return <>{emptyState}</>
  }

  return (
    <div
      className={cn(
        "bg-surface-50 border-default relative overflow-hidden rounded-xl border shadow-sm",
        wrapperClassName,
      )}
    >
      {/* Loading overlay - shows over existing data */}
      {loading && data.length > 0 && <LoadingOverlay />}

      <div className="overflow-x-auto">
        <table className={cn("w-full", minWidth, className)}>
          <DataTableHeader
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            hasActions={!!renderActions}
          />
          <DataTableBody
            columns={columns}
            data={data}
            rowKey={rowKey}
            onRowClick={onRowClick}
            renderActions={renderActions}
            loading={loading}
            skeletonRows={skeletonRows}
          />
        </table>
      </div>
    </div>
  )
}
