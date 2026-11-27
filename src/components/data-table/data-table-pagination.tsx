"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import type { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
      <div className="flex items-center justify-between px-2">
        <div className="hidden lg:flex flex-1 text-xs font-body text-fg-muted">
          {table.getFilteredSelectedRowModel().rows.length} on {table.getFilteredRowModel().rows.length} line(s)
          selected
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p id="data-table-rows-per-page" className="text-xs font-label uppercase tracking-widest text-fg-muted">Lines per page</p>
            <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
            >
              <SelectTrigger aria-labelledby="data-table-rows-per-page" className="h-8 w-[70px] rounded-lg border-line-control text-sm font-body text-fg bg-surface focus:ring-ring">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top" className="rounded-xl border-line bg-canvas">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`} className="text-sm font-body text-fg focus:bg-brand-soft/10 focus:text-brand">
                      {pageSize}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-xs font-body text-fg-muted">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-line text-fg-muted hover:bg-surface-subtle hover:border-brand-soft/40"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to the first page</span>
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg border-line text-fg-muted hover:bg-surface-subtle hover:border-brand-soft/40"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to the previous page</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg border-line text-fg-muted hover:bg-surface-subtle hover:border-brand-soft/40"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to the next page</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-line text-fg-muted hover:bg-surface-subtle hover:border-brand-soft/40"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to the last page</span>
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
  )
}
