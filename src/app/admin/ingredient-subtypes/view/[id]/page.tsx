"use client"

import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Edit, Trash } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GenericView } from "@/components/crud/GenericView"
import type { FieldConfig } from "@/components/crud/types"

import { useIngredientSubTypeMutations } from '@/hooks/mutations/use-ingredient-subtype-mutations'
import {useIngredientSubTypeQuery} from "@/hooks/queries/use-ingredient-subtypes";

const fields: FieldConfig[] = [
    { name: "name", label: "Name", type: "text" },
    {
        name: "type",
        label: "Type",
        type: "custom",
        render: ({ value }) => value?.name ?? "—",
    },
]

export default function SubTypeViewPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const { data: ingredientSubType, isLoading, isError, error } = useIngredientSubTypeQuery(id)
    const { remove } = useIngredientSubTypeMutations()


    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this sub-type?")) return

        try {
            await remove.mutateAsync(id)
            toast.success("Deleted")
            router.push("/admin/ingredient-subtypes")
        } catch {
            toast.error("Error deleting sub-type")
        }
    }

    if (!ingredientSubType) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-muted-foreground">Sub-type not found</p>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading sub-type'}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <Button variant="outline" onClick={() => router.back()} size="sm" className=" mb-6 h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-line text-fg-muted hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <GenericView
                fields={fields}
                data={ingredientSubType as unknown as Record<string, unknown>}
                isLoading={isLoading}
                title={ingredientSubType?.name ?? ''}
                actions={[
                    {
                        label: "Edit",
                        icon: <Edit className="h-4 w-4" />,
                        variant: "outline",
                        onClick: () => router.push(`/admin/ingredient-subtypes/edit/${id}`),
                    },
                    {
                        label: "Delete",
                        icon: <Trash className="h-4 w-4" />,
                        variant: "destructive",
                        onClick: handleDelete,
                    },
                ]}
            />
        </div>
    )
}