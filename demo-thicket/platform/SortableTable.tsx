import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { ReactNode} from "react";
import { useMemo, useState } from "react"

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@thicket/components/ui/table"
import { cn } from "@thicket/lib/utils"

type SortDirection = "asc" | "desc"

export interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  sortFn?: (a: T, b: T, direction: SortDirection) => number
  renderCell?: (row: T) => ReactNode
  renderHeader?: () => ReactNode
  className?: string
  responsive?: string
  align?: "left" | "right" | "center"
}

interface SortableTableProps<T> {
  columns: Column<T>[]
  data: T[]
  sortField?: keyof T
  sortDirection?: SortDirection
  onSortChange?: (field: keyof T, direction: SortDirection) => void
  defaultSortField?: keyof T
  defaultSortDirection?: SortDirection
  rowKey: (row: T) => string | number
  onRowClick?: (row: T, event: React.MouseEvent) => void
  renderActions?: (row: T) => ReactNode
  emptyState?: ReactNode
  loading?: boolean
  minWidth?: string
  className?: string
  wrapperClassName?: string
}

export function SortableTable<T>({
  columns,
  data,
  sortField: controlledSortField,
  sortDirection: controlledSortDirection,
  onSortChange,
  defaultSortField,
  defaultSortDirection = "asc",
  rowKey,
  onRowClick,
  renderActions,
  emptyState,
  loading,
  minWidth = "min-w-[800px]",
  className,
  wrapperClassName,
}: SortableTableProps<T>) {
  const isControlled = controlledSortField !== undefined

  const [internalSortField, setInternalSortField] = useState<
    keyof T | undefined
  >(defaultSortField)
  const [internalSortDirection, setInternalSortDirection] =
    useState<SortDirection>(defaultSortDirection)

  const sortField = isControlled ? controlledSortField : internalSortField
  const sortDirection = isControlled
    ? controlledSortDirection
    : internalSortDirection

  const handleSort = (field: keyof T) => {
    const newDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc"

    if (isControlled) {
      onSortChange?.(field, newDirection)
    } else {
      setInternalSortField(field)
      setInternalSortDirection(newDirection)
    }
  }

  const sortedData = useMemo(() => {
    if (!sortField) return data

    const sorted = [...data]
    const column = columns.find((col) => col.key === sortField)

    sorted.sort((a, b) => {
      if (column?.sortFn) {
        return column.sortFn(a, b, sortDirection!)
      }

      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue
          .toLowerCase()
          .localeCompare(bValue.toLowerCase())
        return sortDirection === "asc" ? comparison : -comparison
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return sorted
  }, [data, sortField, sortDirection, columns])

  const SortIcon = ({ field }: { field: keyof T }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 text-brand-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-brand-600" />
    )
  }

  if (emptyState && sortedData.length === 0 && !loading) {
    return <>{emptyState}</>
  }

  return (
    <div
      className={cn(
        "bg-surface-50 border-default rounded-xl border shadow-sm overflow-hidden",
        wrapperClassName
      )}
    >
      <div className="overflow-x-auto">
        <table className={cn("w-full", minWidth, className)}>
          <TableHeader>
            <tr>
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(column.className, column.responsive)}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wide transition-colors lg:text-sm"
                    >
                      {column.renderHeader
                        ? column.renderHeader()
                        : column.label}
                      <SortIcon field={column.key} />
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide lg:text-sm">
                      {column.renderHeader
                        ? column.renderHeader()
                        : column.label}
                    </span>
                  )}
                </TableHead>
              ))}
              {renderActions && (
                <TableHead className="text-right">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide lg:text-sm">
                    Actions
                  </span>
                </TableHead>
              )}
            </tr>
          </TableHeader>
          <TableBody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={
                    onRowClick
                      ? (e: React.MouseEvent<HTMLTableRowElement>) =>
                          onRowClick(row, e)
                      : undefined
                  }
                  className={cn(
                    "transition-colors hover:bg-gray-50/50",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={String(column.key)}
                      className={cn(
                        column.className,
                        column.responsive,
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center"
                      )}
                    >
                      {column.renderCell
                        ? column.renderCell(row)
                        : String(row[column.key] ?? "")}
                    </TableCell>
                  ))}
                  {renderActions && (
                    <TableCell className="text-right">
                      {renderActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
