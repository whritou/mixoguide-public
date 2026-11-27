"use client"

import type { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DataTableFiltersProps<TData> {
  table: Table<TData>
  filterableColumns: {
    id: string
    title: string
    options: {
      label: string
      value: string
    }[]
  }[]
}

export function DataTableFilters<TData>({ table, filterableColumns }: DataTableFiltersProps<TData>) {
  const filters = table.getState().columnFilters
  const isFiltered = filters.length > 0

  return (
      <>
        {filterableColumns.length > 0 && (
            <div className="flex gap-2">
              {filterableColumns.map((column) => {
                const filter = filters.find((filter) => filter.id === column.id)
                const selectedValues = (filter?.value ?? []) as string[]
                const selectedCount = selectedValues.length

                return (
                    <Popover key={column.id}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 border-dashed">
                          <span>{column.title}</span>
                          {selectedCount > 0 && (
                              <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal">
                                {selectedCount}
                                <span className="sr-only"> selected</span>
                              </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={`Search ${column.title}...`} aria-label={`Search ${column.title}`} />
                          <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                              {column.options.map((option) => {
                                const isSelected = selectedValues.includes(option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                          const columnInstance = table.getColumn(column.id)
                                          if (!columnInstance) return

                                          const newValue = isSelected
                                              ? selectedValues.filter((v) => v !== option.value)
                                              : [...selectedValues, option.value]

                                          columnInstance.setFilterValue(newValue)
                                        }}
                                    >
                                      <div
                                          className={cn(
                                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                              isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                          )}
                                      >
                                        <X className="h-3 w-3" aria-hidden="true" />
                                      </div>
                                      <span>{option.label}</span>
                                      {isSelected && <span className="sr-only"> (selected)</span>}
                                    </CommandItem>
                                )
                              })}
                            </CommandGroup>
                            {isFiltered && (
                                <>
                                  <CommandSeparator />
                                  <CommandGroup>
                                    <CommandItem
                                        onSelect={() => table.resetColumnFilters()}
                                        className="justify-center text-center"
                                    >
                                      Reset filters
                                    </CommandItem>
                                  </CommandGroup>
                                </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                )
              })}
              {isFiltered && (
                  <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
                    Reset
                    <X className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
              )}
            </div>
        )}
      </>
  )
}
