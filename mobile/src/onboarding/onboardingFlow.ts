import type { CocktailDTO, UserPantryItemDTO } from '@mixoguide/shared'
import { isBlockingCocktailIngredient } from '@mixoguide/shared'

export type OnboardingStepId = 'pick' | 'favorite' | 'plan' | 'stock' | 'make' | 'done'

export type OnboardingCocktailCandidate = CocktailDTO

export interface OnboardingPantryItem {
    ingredientId: string
    ingredientName: string
    quantity: number
    unit: string
}

export interface OnboardingDataSnapshot {
    favoriteIds: string[]
    pantryItems: UserPantryItemDTO[]
    plannedCocktails: unknown[]
    plannedCollections: unknown[]
}

export function getOnboardingCandidates(cocktails: CocktailDTO[]): OnboardingCocktailCandidate[] {
    return cocktails
        .filter(cocktail => (cocktail.ingredients ?? []).some(isBlockingCocktailIngredient))
        .slice(0, 3)
}

export function buildOnboardingPantryItems(
    cocktail: CocktailDTO | null,
    pantryItems: UserPantryItemDTO[],
    servings: number,
): OnboardingPantryItem[] {
    if (!cocktail) return []

    const stockedIngredientIds = new Set(
        pantryItems
            .filter(item => item.isInPantry)
            .map(item => item.ingredientId)
    )

    return (cocktail.ingredients ?? [])
        .filter(isBlockingCocktailIngredient)
        .filter(ingredient => !stockedIngredientIds.has(ingredient.ingredientId))
        .map(ingredient => ({
            ingredientId: ingredient.ingredientId,
            ingredientName: ingredient.ingredient?.name ?? 'Ingredient',
            quantity: Math.max(0.01, Math.round(((ingredient.amount ?? 1) * servings) * 100) / 100),
            unit: ingredient.unit ?? 'pcs',
        }))
}

export function hasMeaningfulOnboardingData(snapshot: OnboardingDataSnapshot): boolean {
    return snapshot.favoriteIds.length > 0
        || snapshot.pantryItems.length > 0
        || snapshot.plannedCocktails.length > 0
        || snapshot.plannedCollections.length > 0
}

export function defaultOnboardingPlanDate(): string {
    const date = new Date()
    date.setHours(19, 0, 0, 0)
    return date.toISOString()
}
