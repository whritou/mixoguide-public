"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import Loader from "@/components/ui/Loader"
import { GenericForm } from "@/components/crud/GenericForm"
import type { FieldConfig } from "@/components/crud/types"
import { useIngredientMutations } from '@/hooks/mutations/use-ingredient-mutations'
import { TypeSubTypeSelector, type TypeSubTypeValue } from "@/components/crud/fields/TypeSubTypeSelector"
import type { Ingredient } from "@/types/models/ingredient"
import { useIngredientQuery } from "@/hooks/queries/use-ingredients"

interface IngredientFormData extends Omit<Ingredient, 'id' | 'typeId' | 'subTypeId' | 'type' | 'subType'> {
    typeAndSubType: TypeSubTypeValue
}

const UNIT_OPTIONS = [
    { label: "cl",    value: "cl"    },
    { label: "ml",    value: "ml"    },
    { label: "oz",    value: "oz"    },
    { label: "g",     value: "g"     },
    { label: "pcs",   value: "pcs"   },
    { label: "zest",  value: "zest"  },
    { label: "slice", value: "slice" },
    { label: "twist", value: "twist" },
]

const buildFields = (): FieldConfig[] => [
    { name: "name",        label: "Name",        type: "text",     required: true },
    {
        name : "typeAndSubType",
        label: "",
        type : "custom",
        render: ({ value, onChange, isSubmitting }) => (
            <TypeSubTypeSelector
                value={value ?? { typeId: "", subTypeId: "" }}
                onChange={onChange}
                disabled={isSubmitting}
            />
        ),
    },
    { name: "description", label: "Description", type: "textarea"                },
    { name: "brand",       label: "Brand",       type: "text"                    },
    { name: "unit",        label: "Unit",        type: "select", options: UNIT_OPTIONS, required: true, defaultValue: "oz" },
    { name: "isAlcoholic", label: "Alcoholic",   type: "switch"                  },
    { name: "abv",         label: "ABV (%)",     type: "number"                  },
    { name: "imageUrl",    label: "Image URL",   type: "url"                     },
]

export default function EditIngredientPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const { data: ingredient, isLoading, isError, error } = useIngredientQuery(id)
    const { update } = useIngredientMutations()
    const [defaultValues, setDefaultValues] = useState<IngredientFormData | null>(null)

    useEffect(() => {
        if (!ingredient) return
        setDefaultValues({
            ...ingredient,
            typeAndSubType: {
                typeId: ingredient.typeId ?? '',
                subTypeId: ingredient.subTypeId ?? '',
            },
        })
    }, [ingredient])

    const handleSubmit = async (data: IngredientFormData) => {
        try {
            const { typeAndSubType, ...rest } = data
            const selectedTypeId = typeAndSubType?.typeId?.trim()
            if (!selectedTypeId) {
                toast.error('Please select an ingredient type')
                return
            }
            if (!rest.unit) {
                toast.error('Please select a unit')
                return
            }
            const payload = {
                ...rest,
                typeId: selectedTypeId,
                subTypeId: typeAndSubType?.subTypeId || undefined,
            }
            const updated = await update.mutateAsync({ id, data: payload })
            if (!updated) throw new Error('Failed to update ingredient')
            toast.success('Ingredient updated successfully')
            router.push('/admin/ingredients')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error updating ingredient')
        }
    }

    if (isLoading && !defaultValues) {
        return <div className="container mx-auto py-10 h-40 flex items-center justify-center"><Loader variant="spinner" /></div>
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

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-mg-sand text-mg-muted hover:bg-mg-linen hover:text-mg-charcoal hover:border-mg-caramel/40">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            <div className="max-w-3xl mx-auto">
                {defaultValues ? (
                    <GenericForm
                        fields={buildFields()}
                        defaultValues={defaultValues}
                        isLoading={isLoading}
                        onSubmit={handleSubmit}
                        onCancel={() => router.back()}
                        title="Edit ingredient"
                        submitButtonLabel="Save"
                    />
                ) : (
                    <div className="text-center p-6 border rounded-md">
                        <p className="text-muted-foreground">Ingredient not found</p>
                    </div>
                )}
            </div>
        </div>
    )
}
