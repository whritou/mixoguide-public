import type { CocktailDTO, UserPantryItemDTO } from '@mixoguide/shared'
import {
    buildOnboardingPantryItems,
    getOnboardingCandidates,
    hasMeaningfulOnboardingData,
} from '../onboardingFlow'

function makeCocktail(overrides: Partial<CocktailDTO> = {}): CocktailDTO {
    return {
        id: 'cocktail-1',
        name: 'Daiquiri',
        description: null,
        fullDescription: null,
        instructions: [],
        imageUrl: null,
        isAlcoholic: true,
        mainAlcoholId: null,
        source: 'custom',
        difficulty: 'easy',
        preparationTime: 4,
        technique: ['shaken'],
        flavors: [],
        occasions: [],
        origin: null,
        glassId: null,
        avgRating: 4.5,
        ratingCount: 12,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ingredients: [
            {
                ingredientId: 'rum',
                amount: 2,
                unit: 'oz',
                optional: false,
                substitutes: [],
                ingredient: {
                    id: 'rum',
                    name: 'White rum',
                    imageUrl: null,
                    isAlcoholic: true,
                    abv: 40,
                    type: { name: 'Spirit' },
                    subType: null,
                },
            },
            {
                ingredientId: 'lime',
                amount: 1,
                unit: 'oz',
                optional: false,
                substitutes: [],
                ingredient: {
                    id: 'lime',
                    name: 'Lime juice',
                    imageUrl: null,
                    isAlcoholic: false,
                    abv: null,
                    type: { name: 'Juice' },
                    subType: null,
                },
            },
            {
                ingredientId: 'twist',
                amount: 1,
                unit: 'twist',
                optional: false,
                substitutes: [],
                ingredient: {
                    id: 'twist',
                    name: 'Lime twist',
                    imageUrl: null,
                    isAlcoholic: false,
                    abv: null,
                    type: { name: 'Garnish' },
                    subType: null,
                },
            },
            {
                ingredientId: 'mint',
                amount: 1,
                unit: 'pcs',
                optional: true,
                substitutes: [],
                ingredient: {
                    id: 'mint',
                    name: 'Mint sprig',
                    imageUrl: null,
                    isAlcoholic: false,
                    abv: null,
                    type: { name: 'Garnish' },
                    subType: null,
                },
            },
        ],
        ...overrides,
    }
}

function makePantryItem(overrides: Partial<UserPantryItemDTO>): UserPantryItemDTO {
    return {
        id: 'pantry-1',
        userId: 'user-1',
        ingredientId: 'rum',
        quantity: 1,
        unitLeft: 'oz',
        favorite: false,
        expirationDate: null,
        isEssential: false,
        isInfinite: false,
        isInPantry: true,
        isInShoppingList: false,
        shoppingQuantity: 0,
        addedAt: '2026-01-01T00:00:00.000Z',
        note: null,
        updatedAt: null,
        ingredient: null,
        ...overrides,
    }
}

describe('onboarding flow helpers', () => {
    it('builds pantry items from required missing ingredients only', () => {
        const items = buildOnboardingPantryItems(makeCocktail(), [], 2)

        expect(items).toEqual([
            {
                ingredientId: 'rum',
                ingredientName: 'White rum',
                quantity: 4,
                unit: 'oz',
            },
            {
                ingredientId: 'lime',
                ingredientName: 'Lime juice',
                quantity: 2,
                unit: 'oz',
            },
        ])
    })

    it('skips ingredients that are already in the user pantry', () => {
        const items = buildOnboardingPantryItems(
            makeCocktail(),
            [makePantryItem({ ingredientId: 'rum', isInPantry: true })],
            1,
        )

        expect(items).toEqual([
            {
                ingredientId: 'lime',
                ingredientName: 'Lime juice',
                quantity: 1,
                unit: 'oz',
            },
        ])
    })

    it('returns exactly three candidates with required ingredients', () => {
        const candidates = getOnboardingCandidates([
            makeCocktail({ id: 'no-ingredients', ingredients: [] }),
            makeCocktail({ id: 'one', name: 'One' }),
            makeCocktail({ id: 'two', name: 'Two' }),
            makeCocktail({ id: 'three', name: 'Three' }),
            makeCocktail({ id: 'four', name: 'Four' }),
        ])

        expect(candidates.map(c => c.id)).toEqual(['one', 'two', 'three'])
    })

    it('detects whether the user already has meaningful onboarding data', () => {
        expect(hasMeaningfulOnboardingData({
            favoriteIds: [],
            pantryItems: [],
            plannedCocktails: [],
            plannedCollections: [],
        })).toBe(false)

        expect(hasMeaningfulOnboardingData({
            favoriteIds: ['cocktail-1'],
            pantryItems: [],
            plannedCocktails: [],
            plannedCollections: [],
        })).toBe(true)

        expect(hasMeaningfulOnboardingData({
            favoriteIds: [],
            pantryItems: [makePantryItem({ ingredientId: 'rum' })],
            plannedCocktails: [],
            plannedCollections: [],
        })).toBe(true)
    })
})
