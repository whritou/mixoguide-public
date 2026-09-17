'use client'

import { useState, useEffect, useTransition } from "react"
import {
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { Plus } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFilters } from "./data-table-filters"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchColumn?: string
    searchPlaceholder?: string
    filterableColumns?: {
        id: string
        title: string
        options: { label: string; value: string }[]
    }[]
    createButtonLink?: string
    createButtonLabel?: string
    pageTitle?: string
    pageDescription?: string
    onRowDoubleClick?: (row: TData) => void
    pagination?: {
        pageIndex: number
        pageSize: number
        setPageIndex: (index: number) => void
        setPageSize: (size: number) => void
    }
    totalItems?: number
    isLoading?: boolean
    isFetching?: boolean
    searchValue?: string
    onSearchChange?: (value: string) => void
}

export function DataTable<TData, TValue>({
                                             columns,
                                             data,
                                             searchColumn,
                                             searchPlaceholder = "Find...",
                                             filterableColumns = [],
                                             createButtonLink,
                                             createButtonLabel = "Create",
                                             pageTitle,
                                             pageDescription,
                                             onRowDoubleClick,
                                             pagination,
                                             totalItems,
                                             isLoading = false,
                                             isFetching = false,
                                             searchValue,
                                             onSearchChange,
                                         }: DataTableProps<TData, TValue>) {

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})
    const [localSearch, setLocalSearch] = useState(searchValue ?? "")
    const [, startTransition] = useTransition()

    const showInitialLoader = isLoading
    const showBackgroundLoading = !isLoading && isFetching

    useEffect(() => {
        setLocalSearch(searchValue ?? "")
    }, [searchValue])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        manualPagination: true,
        pageCount: pagination?.pageSize && totalItems
            ? Math.ceil(totalItems / pagination.pageSize)
            : 1,
        state: {
            pagination: {
                pageIndex: pagination?.pageIndex || 0,
                pageSize: pagination?.pageSize || 20,
            },
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        onPaginationChange: (updater) => {
            if (!pagination) return
            const next = typeof updater === "function"
                ? updater({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize })
                : updater

            if (next.pageSize !== pagination.pageSize) {
                pagination.setPageSize(next.pageSize)
            } else if (next.pageIndex !== pagination.pageIndex) {
                pagination.setPageIndex(next.pageIndex)
            }
        },
    })

    return (
        <div className="space-y-4">

            {(pageTitle || pageDescription) && (
                <div className="space-y-1">
                    {pageTitle && <h2 className="text-2xl tracking-tight">{pageTitle}</h2>}
                    {pageDescription && <p className="text-sm text-muted-foreground">{pageDescription}</p>}
                </div>
            )}

            {/* background loading indicator */}
            {showBackgroundLoading && (
                <div className="text-xs text-muted-foreground">
                    Updating...
                </div>
            )}

            <div className="flex justify-between">
                <div className="flex items-center gap-2">
                    {searchColumn && (
                        <Input
                            placeholder={searchPlaceholder}
                            value={onSearchChange ? localSearch : ((table.getColumn(searchColumn)?.getFilterValue() as string) ?? "")}
                            onChange={(e) => {
                                if (onSearchChange) {
                                    setLocalSearch(e.target.value)
                                    startTransition(() => onSearchChange(e.target.value))
                                } else {
                                    table.getColumn(searchColumn)?.setFilterValue(e.target.value)
                                }
                            }}
                        />
                    )}

                    {filterableColumns.length > 0 && (
                        <DataTableFilters table={table} filterableColumns={filterableColumns} />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {createButtonLink && (
                        <Button asChild>
                            <Link href={createButtonLink}>
                                <Plus className="mr-1 h-4 w-4" />
                                {createButtonLabel}
                            </Link>
                        </Button>
                    )}
                    <DataTableViewOptions table={table} />
                </div>
            </div>

            {/* table + loading overlay */}
            <div className="relative border rounded-md bg-white">

                {showInitialLoader && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                        <span className="text-sm">Loading...</span>
                    </div>
                )}

                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    onDoubleClick={() => onRowDoubleClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center h-24">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <DataTablePagination table={table} />
        </div>
    )
}