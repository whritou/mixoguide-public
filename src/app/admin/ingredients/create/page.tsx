"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GenericForm } from "@/components/crud/GenericForm"
import type { FieldConfig } from "@/components/crud/types"
import { useIngredientMutations } from '@/hooks/mutations/use-ingredient-mutations'
import { Ingredient } from "@/types/models/ingredient"
import { TypeSubTypeSelector, type TypeSubTypeValue } from "@/components/crud/fields/TypeSubTypeSelector"

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

const ingredientFields: FieldConfig[] = [
    { name: "name",        label: "Name",        type: "text",     required: true },
    {
        name : "typeAndSubType",
        label: "",
        type : "custom",
        defaultValue: { typeId: "", subTypeId: "" } as TypeSubTypeValue,
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

export default function CreateIngredientPage() {
    const router = useRouter()
    const { create } = useIngredientMutations()
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (data: IngredientFormData) => {
        setSubmitting(true)
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
            const payload: Partial<Ingredient> = {
                ...rest,
                typeId   : selectedTypeId,
                subTypeId: typeAndSubType?.subTypeId || undefined,
            }
            const created = await create.mutateAsync(payload as Ingredient)
            if (!created) throw new Error('Failed to create ingredient')
            toast.success('Ingredient created successfully')
            router.push('/admin/ingredients')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error creating ingredient')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-line text-fg-muted hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>
            <div className="max-w-3xl mx-auto">
                <GenericForm
                    fields={ingredientFields}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    isLoading={submitting}
                    title="Create a new ingredient"
                    description="Add a new ingredient to the collection"
                    submitButtonLabel="Create"
                />
            </div>
        </div>
    )
}
