'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { GenericForm } from '@/components/crud/GenericForm'
import IngredientRepeater, { RepeaterIngredient } from '@/components/IngredientRepeater'
import { MainAlcoholSelectField } from '@/components/MainAlcoholSelectField'
import { useCocktailMutations } from '@/hooks/mutations/use-cocktail-mutations'
import { useCocktailQuery } from '@/hooks/queries/use-cocktails'
import { useBarToolsQuery } from '@/hooks/queries/use-bar-tools'
import { useGlassesQuery } from "@/hooks/queries/use-glasses"
import type { Cocktail, CocktailFormData, CocktailIngredient } from "@/types/models/cocktail"
import { buildCocktailFields } from '../../cocktailFields'


export default function EditCocktailPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const { update, syncIngredients, syncBarTools } = useCocktailMutations()

    const { data: cocktail, isLoading: cocktailLoading, error: cocktailError, isError: isCocktailError } = useCocktailQuery(id)

    const { data: allBarTools,  isLoading: toolLoading, error: barToolsError, isError: isBarToolsError } = useBarToolsQuery({ limit: 200 })
    const { data: allGlasses, isLoading: glassLoading, error: glassesError, isError: isGlassesError } = useGlassesQuery({ limit: 200 })

    const glasses = allGlasses?.items ?? []
    const barTools = allBarTools?.items ?? []

    const [defaultValues, setDefaultValues] = useState<CocktailFormData | null>(null)

    useEffect(() => {
        if (!cocktail?.ingredients) return
        const ingredients: RepeaterIngredient[] = cocktail.ingredients.map((row) => ({
            ingredientId: row.ingredientId,
            ingredient:   (row as CocktailIngredient & { ingredient?: { id: string; name: string } }).ingredient,
            amount:       row.amount ? String(row.amount) : '',
            unit:         row.unit ?? 'oz',
            optional:     row.optional ?? false,
            substitutes:  [],
        }))
        const barToolIds = (cocktail.barTools ?? []).map((b) => b.barTool?.id ?? b.barTool.id)

        setDefaultValues({
            ...(cocktail as unknown as CocktailFormData),
            mainAlcoholId:    cocktail.mainAlcoholId ?? '',
            glassId:          cocktail.glassId       ?? '',
            barToolIds,
            ingredients,
            instructionsText: cocktail.instructions?.join('\n') ?? '',
            technique:        cocktail.technique ?? [],
            flavors:          cocktail.flavors   ?? [],
            occasions:        cocktail.occasions ?? [],
        })
    }, [cocktail])

    const loading = cocktailLoading || toolLoading || glassLoading

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
        try {
            const { instructionsText, ingredients, barToolIds, ...rest } = data

            const updated = await update.mutateAsync({ id, data: {
                ...rest,
                instructions: instructionsText
                    ? instructionsText.split('\n').map((l) => l.trim()).filter(Boolean)
                    : [],
                technique: rest.technique as Cocktail['technique'],
                flavors:   rest.flavors   as Cocktail['flavors'],
                occasions: rest.occasions as Cocktail['occasions'],
            }})
            if (!updated) throw new Error('Failed to update cocktail')

            await Promise.all([
                syncIngredients.mutateAsync({ id, ingredients: ingredients.map((item) => ({
                    ingredientId: item.ingredient?.id ?? '',
                    amount:       item.amount ? parseFloat(item.amount) : undefined,
                    unit:         item.unit,
                    optional:     !!item.optional,
                    substitutes:  [],
                }))}),
                syncBarTools.mutateAsync({ id, ids: barToolIds ?? [] }),
            ])
            toast.success('Cocktail updated')
            router.push('/admin/cocktails')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error updating cocktail')
        }
    }

    if (isCocktailError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-danger">
                    {cocktailError instanceof Error ? cocktailError.message : 'Error loading cocktai'}
                </p>
            </div>
        )
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
                {defaultValues && (
                    <GenericForm<CocktailFormData>
                        fields={fields}
                        defaultValues={defaultValues}
                        onSubmit={handleSubmit}
                        onCancel={() => router.back()}
                        isLoading={loading}
                        title="Edit cocktail"
                        description="Update the cocktail details"
                        submitButtonLabel="Save changes"
                    />
                )}
            </div>
        </div>
    )
}