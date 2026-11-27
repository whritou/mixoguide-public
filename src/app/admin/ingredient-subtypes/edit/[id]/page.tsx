'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { GenericForm } from '@/components/crud/GenericForm'
import type { FieldConfig } from '@/components/crud/types'

import { useIngredientSubTypeMutations } from '@/hooks/mutations/use-ingredient-subtype-mutations'
import { useIngredientSubTypeQuery } from '@/hooks/queries/use-ingredient-subtypes'
import { useIngredientTypesQuery } from '@/hooks/queries/use-ingredient-types'
import Loader from '@/components/ui/Loader'

interface Form {
    name: string
    typeId: string
}

export default function EditIngredientSubTypePage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()

    const [def, setDef] = useState<Form>()

    const { data: ingredientSubType, isLoading, isError, error } = useIngredientSubTypeQuery(id)
    const { data: typeData, isLoading: typesLoading } = useIngredientTypesQuery({ limit: 500, sortBy: 'name' })
    const { update } = useIngredientSubTypeMutations()
    const typeOptions = (typeData?.items ?? []).map((type) => ({ label: type.name, value: type.id }))
    const fields: FieldConfig[] = [
        {
            name:        'typeId',
            label:       'Ingredient type',
            type:        'select',
            required:    true,
            options:     typeOptions,
            placeholder: typesLoading ? 'Loading types...' : 'Select an ingredient type',
            description: 'Choose the parent type this sub-type belongs to.',
        },
        { name: 'name', label: 'Sub-type name', type: 'text', required: true },
    ]

    useEffect(() => {
        if (!ingredientSubType) return
        setDef({ name: ingredientSubType.name, typeId: ingredientSubType.typeId })
    }, [ingredientSubType])

    const submit = async (data: Form) => {
        try {
            const updated = await update.mutateAsync({ id, data })
            if (!updated) throw new Error('Failed to update sub-type')
            toast.success('Sub-type updated successfully')
            router.push('/admin/ingredient-subtypes')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Update failed')
        }
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading ingredient sub-type'}
                </p>
            </div>
        )
    }

    if (isLoading || typesLoading || !def) {
        return <Loader label="Loading ingredient sub-type..." />
    }

    return (
        <div className="container mx-auto py-10">
            <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-line text-fg-muted hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <GenericForm<Form>
                fields={fields}
                defaultValues={def}
                onSubmit={submit}
                onCancel={() => router.back()}
                title="Edit ingredient sub type"
                description="Update the sub-type name or move it under a different parent type."
                submitButtonLabel="Save changes"
            />
        </div>
    )
}
