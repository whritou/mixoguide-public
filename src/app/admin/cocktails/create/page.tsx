'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { GenericForm } from '@/components/crud/GenericForm'
import IngredientRepeater from '@/components/IngredientRepeater'
import { MainAlcoholSelectField } from '@/components/MainAlcoholSelectField'
import { useCocktailMutations } from '@/hooks/mutations/use-cocktail-mutations'
import type { CocktailFormData } from "@/types/models/cocktail"
import { buildCocktailFields } from '../cocktailFields'
import {useBarToolsQuery} from "@/hooks/queries/use-bar-tools";
import {useGlassesQuery} from "@/hooks/queries/use-glasses";

export default function CreateCocktailPage() {
    const router = useRouter()

    const { create, syncIngredients, syncBarTools } = useCocktailMutations()

    const { data: allBarTools,  isLoading: toolLoading, error: barToolsError, isError: isBarToolsError } = useBarToolsQuery({ limit: 200 })
    const { data: allGlasses, isLoading: glassLoading, error: glassesError, isError: isGlassesError } = useGlassesQuery({ limit: 200 })

    const glasses = allGlasses?.items ?? []
    const barTools = allBarTools?.items ?? []

    const [submitting,  setSubmitting]  = useState(false)

    const loading = toolLoading || glassLoading

    const fields = buildCocktailFields({
        glassOptions:   glasses.map((g) => ({ label: g.name, value: g.id })),
        barToolOptions: barTools.map((b) => ({ label: b.name, value: b.id })),
        mainAlcoholSelect: ({ value, onChange, isSubmitting }) => (
            <MainAlcoholSelectField value={value ?? ''} onChange={onChange} disabled={isSubmitting} />
        ),
        ingredientRepeater: ({ value, onChange, error, isSubmitting }) => (
            <IngredientRepeater value={value} onChange={onChange} disabled={isSubmitting} error={error} />
        ),
    })

    const handleSubmit = async (data: CocktailFormData) => {
        setSubmitting(true)
        try {
            const { instructionsText, ingredients, barToolIds, ...rest } = data

            const created = await create.mutateAsync({
                ...rest,
                instructions: instructionsText
                    ? instructionsText.split('\n').map((l) => l.trim()).filter(Boolean)
                    : [],
                technique: rest.technique,
                flavors: rest.flavors,
                occasions: rest.occasions,
            })
            if (!created) throw new Error('Failed to create cocktail')

            const syncs: Promise<unknown>[] = []

            if (ingredients?.length) {
                syncs.push(syncIngredients.mutateAsync({ id: created.id, ingredients: ingredients.map((item) => ({
                    ingredientId: item.ingredient?.id ?? '',
                    amount:       item.amount ? parseFloat(item.amount) : undefined,
                    unit:         item.unit,
                    optional:     !!item.optional,
                    substitutes:  [],
                }))}))
            }
            if (barToolIds?.length) syncs.push(syncBarTools.mutateAsync({ id: created.id, ids: barToolIds }))

            await Promise.all(syncs)
            toast.success('Cocktail created successfully')
            router.push('/admin/cocktails')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error creating cocktail')
        } finally {
            setSubmitting(false)
        }
    }

    if (isBarToolsError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-danger">
                    {barToolsError instanceof Error ? barToolsError.message : 'Error loading bar tools'}
                </p>
            </div>
        )
    }

    if (isGlassesError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-danger">
                    {glassesError instanceof Error ? glassesError.message : 'Error loading glasses'}
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
            <div className="max-w-3xl mx-auto">
                <GenericForm<CocktailFormData>
                    fields={fields}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    isLoading={loading || submitting}
                    title="Create a new cocktail"
                    description="Fill the form to add a cocktail to the database"
                    submitButtonLabel="Create"
                />
            </div>
        </div>
    )
}