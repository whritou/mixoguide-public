'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { GenericForm } from '@/components/crud/GenericForm'
import type { FieldConfig } from '@/components/crud/types'

import { useIngredientTypeMutations } from '@/hooks/mutations/use-ingredient-type-mutations'
import {useIngredientTypeQuery} from "@/hooks/queries/use-ingredient-types";

interface IngredientTypeFormData {
    name: string
}

const fields: FieldConfig[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
]

export default function EditIngredientTypePage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const { data: ingredientType, isLoading, isError, error } = useIngredientTypeQuery(id)
    const { update } = useIngredientTypeMutations()

    const [defaultValues, setDefaultValues] = useState<IngredientTypeFormData | null>(null)

    useEffect(() => {
        if (!ingredientType) return
        setDefaultValues({ name: ingredientType.name })
    }, [ingredientType])

    const handleSubmit = async (data: IngredientTypeFormData) => {
        try {
            const updated = await update.mutateAsync({ id, data })
            if (!updated) throw new Error('Failed to update type')
            toast.success('Type updated successfully')
            router.push('/admin/ingredient-types')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error updating type')
        }
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading ingredient type'}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-line text-fg-muted hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            <div className="max-w-2xl mx-auto">
                {defaultValues ? (
                    <GenericForm<IngredientTypeFormData>
                        fields={fields}
                        defaultValues={defaultValues}
                        onSubmit={handleSubmit}
                        onCancel={() => router.back()}
                        isLoading={isLoading}
                        title="Edit Ingredient Type"
                        description="Modify the details of the ingredient type"
                        submitButtonLabel="Save changes"
                    />
                ) : (
                    <div className="text-center p-6 border rounded-md">
                        <p className="text-muted-foreground">Type not found</p>
                    </div>
                )}
            </div>
        </div>
    )
}