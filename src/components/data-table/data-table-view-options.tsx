import type { Table } from "@tanstack/react-table"
import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-mg-sand text-mg-muted hover:bg-mg-linen hover:text-mg-charcoal hover:border-mg-caramel/40">
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-mg-sand bg-mg-cream">
          <DropdownMenuLabel className="text-xs font-label uppercase tracking-widest text-mg-muted">Display columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
              .getAllColumns()
              .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
              .map((column) => {
                return (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                )
              })}
        </DropdownMenuContent>
      </DropdownMenu>
  )
}
