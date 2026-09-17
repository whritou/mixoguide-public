import type React from "react"

import type { CellContext, ColumnDef } from "@tanstack/react-table"
import type { FieldValues } from "react-hook-form"
import { MoreHorizontal, Pencil, Trash, Eye } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export function createColumns<T extends FieldValues>(config: {
  columns: Array<{
    id: keyof T | string
    header: string
    accessorKey?: keyof T
    cell?: (info: CellContext<T, unknown>) => React.ReactNode
    enableSorting?: boolean
    enableHiding?: boolean
    maxWidth?: string
  }>
  viewRoute?: string
  editRoute?: string
  deleteAction?: (id: string) => Promise<void>
  onDelete?: (id: string) => void
}): ColumnDef<T>[] {
  const { columns, viewRoute, editRoute, deleteAction, onDelete } = config

  const baseColumns: ColumnDef<T>[] = [
    {
      id: "select",
      header: ({ table }) => (
          <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
          />
      ),
      cell: ({ row }) => (
          <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select the line"
          />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...columns.map((column) => ({
      id: column.id.toString(),
      header: column.header,
      accessorKey: column.accessorKey?.toString(),
      cell:
          column.cell ||
          (({ row }: CellContext<T, unknown>) => {
            const value = column.accessorKey ? row.original[column.accessorKey as string] : null
            return <div>{value !== null && value !== undefined ? String(value) : ""}</div>
          }),
      enableSorting: column.enableSorting ?? true,
      enableHiding: column.enableHiding ?? true,
      meta: {
        maxWidth: column.maxWidth ?? "200px",
      },
    }))
  ]

  // Add actions column if any action is provided
  if (viewRoute || editRoute || deleteAction || onDelete) {
    baseColumns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original
        const id = String(item.id ?? "")

        return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open the menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {viewRoute && (
                    <DropdownMenuItem asChild>
                      <Link href={`${viewRoute}/${id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        See
                      </Link>
                    </DropdownMenuItem>
                )}
                {editRoute && (
                    <DropdownMenuItem asChild>
                      <Link href={`${editRoute}/${id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                )}
                {(deleteAction || onDelete) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this item ?")) {
                              if (deleteAction) {
                                await deleteAction(id)
                              } else if (onDelete) {
                                onDelete(id)
                              }
                            }
                          }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        )
      },
    })
  }

  return baseColumns
}

// Helper components for common cell types
export const CellComponents = {
  Image: ({ src, alt = "Image", size = 40 }: { src: string; alt?: string; size?: number }) => (
      <div className="relative" style={{ width: size, height: size }}>
        <Image src={src || "/placeholder.svg?height=40&width=40"} alt={alt} height={size} width={size} className="rounded-md object-cover" />
      </div>
  ),

  Badge: ({
            value,
            variant = "default",
          }: { value: string; variant?: "default" | "secondary" | "destructive" | "outline" }) => (
      <Badge variant={variant}>{value}</Badge>
  ),

  ColorSwatch: ({ color }: { color: string }) => (
      <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: color }} title={color} />
  ),

  GradientSwatch: ({ gradient }: { gradient: string }) => {
    const colors = gradient.split(",")
    const gradientStyle =
        colors.length > 1
            ? { background: `linear-gradient(to right, ${colors.join(", ")})` }
            : { backgroundColor: colors[0] }

    return <div className="h-6 w-12 rounded border" style={gradientStyle} title={gradient} />
  },

  Boolean: ({ value }: { value: boolean }) => (
      <Badge variant={value ? "bronze" : "warm"}>{value ? "Yes" : "No"}</Badge>
  ),

  Date: ({ date, format = "local" }: { date: string | Date; format?: "local" | "relative" }) => {
    const d = new Date(date)
    if (format === "relative") {
      // Simple relative time
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      return `Il y a ${Math.floor(diffDays / 30)} mois`
    }

    return d.toLocaleDateString("fr-FR")
  },

  Number: ({ value, format = "standard" }: { value: number; format?: "standard" | "currency" | "percent" }) => {
    if (format === "currency") {
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value)
    }
    if (format === "percent") {
      return new Intl.NumberFormat("fr-FR", { style: "percent" }).format(value / 100)
    }
    return new Intl.NumberFormat("fr-FR").format(value)
  },
}
