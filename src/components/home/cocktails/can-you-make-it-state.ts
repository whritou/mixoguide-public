import { isBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'
import type { MakeablePreview } from '@/types/models/cocktail'

export type CanYouMakeItIngredient = {
    id: string
    name: string
    optional?: boolean | null
    amount?: number | null
    unit?: string | null
    type?: string | null
    subType?: string | null
}

export type CanYouMakeItState = {
    status: 'empty' | 'partial' | 'ready'
    have: number
    total: number
    missing: string[]
    alsoCount: number
}

export function isRequiredIngredient(ingredient: CanYouMakeItIngredient): boolean {
    return isBlockingCocktailIngredient({
        optional: ingredient.optional,
        amount: ingredient.amount,
        unit: ingredient.unit,
        ingredient: {
            name: ingredient.name,
            type: { name: ingredient.type },
            subType: { name: ingredient.subType },
        },
    })
}

export function joinNames(names: string[]): string {
    if (names.length <= 1) return names.join('')
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function localCoverage(ingredients: CanYouMakeItIngredient[], ids: string[]) {
    const ticked = new Set(ids)
    const required = ingredients.filter(isRequiredIngredient)
    return { total: required.length, missing: required.filter(i => !ticked.has(i.id)).map(i => i.name) }
}

export function deriveCanMakeState(
    ingredients: CanYouMakeItIngredient[],
    ids: string[],
    preview?: Pick<MakeablePreview, 'makeableCount' | 'target'>,
): CanYouMakeItState {
    const { total, missing } = preview?.target
        ? { total: preview.target.requiredCount, missing: preview.target.missing.map(i => i.name) }
        : localCoverage(ingredients, ids)
    const have = total - missing.length
    const status = ids.length === 0 || total === 0 ? 'empty' : missing.length === 0 ? 'ready' : 'partial'
    const alsoCount = Math.max(0, (preview?.makeableCount ?? 0) - (status === 'ready' ? 1 : 0))
    return { status, have, total, missing, alsoCount }
}
