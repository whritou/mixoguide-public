"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Edit, Trash } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

import { GenericView } from "@/components/crud/GenericView"
import type { FieldConfig } from "@/components/crud/types"

import { useIngredientMutations } from '@/hooks/mutations/use-ingredient-mutations'
import {useIngredientQuery} from "@/hooks/queries/use-ingredients";

/* ---------- field map ---------- */
const ingredientFields: FieldConfig[] = [
  { name: "name", label: "Name", type: "text" },

  {
    name : "type",
    label: "Type",
    type : "custom",
    render: ({ value }) =>
      (value as { name?: string } | undefined)?.name ?? "—",
  },
  {
    name : "subType",
    label: "Sub-type",
    type : "custom",
    render: ({ value }) =>
      (value as { name?: string } | undefined)?.name ?? "—",
  },

  { name: "description", label: "Description", type: "textarea" },

  {
    name : "isAlcoholic",
    label: "Alcoholic",
    type : "custom",
    render: ({ value }) => (value ? "Yes" : "No"),
  },
  {
    name : "abv",
    label: "ABV (%)",
    type : "custom",
    render: ({ value }) =>
      value != null ? `${value as number}%` : "Not defined",
  },
]

/* ---------- page ---------- */
export default function IngredientViewPage({
                                             params,
                                           }: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router  = useRouter()

    const { data: ingredient, isLoading, isError, error } = useIngredientQuery(id)
    const { remove } = useIngredientMutations()


    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this ingredient?')) return

        try {
            await remove.mutateAsync(id)
            toast.success('Ingredient deleted successfully')
            router.push('/admin/ingredients')
        } catch {
            toast.error('Error deleting ingredient')
        }
    }

    if (!ingredient) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-muted-foreground">Ingredient not found</p>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-red-500">
                    {error instanceof Error ? error.message : 'Error loading ingredient'}
                </p>
            </div>
        )
    }

  /* -------- render -------- */
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-mg-sand text-mg-muted hover:bg-mg-linen hover:text-mg-charcoal hover:border-mg-caramel/40">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <GenericView
        isLoading={isLoading}
        /* GenericView attend un objet — jamais undefined */
        data={ingredient as unknown as Record<string, unknown>}
        fields={ingredientFields}
        title={ingredient?.name ?? ""}
        description="Ingredient details"
        imageField={{
          name : "imageUrl",
          label: "Image",
          alt  : ingredient?.name ?? "",
        }}
        layout="custom"
        customLayout={{
          leftColumn: [
            "name",
            "type",
            "subType",
            "description",
            "quantity",
            "isAlcoholic",
            "abv",
          ],
          rightColumn: "image",
        }}
        actions={[
          {
            label  : "Edit",
            icon   : <Edit  className="h-4 w-4" />,
            variant: "outline",
            onClick: () => router.push(`/admin/ingredients/edit/${id}`),
          },
          {
            label  : "Delete",
            icon   : <Trash className="h-4 w-4" />,
            variant: "destructive",
            onClick: handleDelete,
          },
        ]}
      />
    </div>
  )
}
