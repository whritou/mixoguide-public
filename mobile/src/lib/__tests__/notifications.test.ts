import type {
    PlannedCocktailDTO,
    PlannedCollectionDTO,
    UserPantryItemDTO,
} from '@mixoguide/shared'
import { buildLocalNotificationPlan } from '../notifications'

function isoAtLocal(year: number, monthIndex: number, day: number, hour: number, minute = 0): string {
    return new Date(year, monthIndex, day, hour, minute, 0, 0).toISOString()
}

function makePlannedCocktail(overrides: Partial<PlannedCocktailDTO> = {}): PlannedCocktailDTO {
    return {
        id: 'pc-1',
        userId: 'user-1',
        cocktailId: 'cocktail-1',
        status: 'planned',
        quantity: 1,
        plannedFor: isoAtLocal(2026, 4, 23, 19),
        completedAt: null,
        createdAt: isoAtLocal(2026, 4, 1, 10),
        updatedAt: null,
        cocktail: {
            id: 'cocktail-1',
            name: 'Negroni',
            imageUrl: null,
            difficulty: 'easy',
        },
        ...overrides,
    }
}

function makePlannedCollection(overrides: Partial<PlannedCollectionDTO> = {}): PlannedCollectionDTO {
    return {
        id: 'col-1',
        userId: 'user-1',
        title: 'Dinner party',
        plannedFor: isoAtLocal(2026, 4, 23, 20),
        servings: 4,
        occasions: [],
        status: 'planned',
        completedAt: null,
        createdAt: isoAtLocal(2026, 4, 1, 10),
        updatedAt: null,
        cocktails: [],
        ...overrides,
    }
}

function makePantryItem(overrides: Partial<UserPantryItemDTO> = {}): UserPantryItemDTO {
    return {
        id: 'item-1',
        userId: 'user-1',
        ingredientId: 'ingredient-1',
        quantity: 0,
        unitLeft: 'ml',
        favorite: false,
        expirationDate: null,
        isEssential: false,
        isInfinite: false,
        isInPantry: true,
        isInShoppingList: false,
        shoppingQuantity: 0,
        addedAt: isoAtLocal(2026, 4, 1, 10),
        note: null,
        updatedAt: null,
        ingredient: null,
        ...overrides,
    }
}

describe('buildLocalNotificationPlan', () => {
    it('creates one today reminder and one upcoming overdue reminder for today plans', () => {
        const now = new Date(2026, 4, 23, 9, 0, 0, 0)

        const plans = buildLocalNotificationPlan(
            {
                plannedCocktails: [makePlannedCocktail()],
                plannedCollections: [makePlannedCollection()],
                pantryItems: [],
            },
            now
        )

        expect(plans.some(plan => plan.identifier.includes('-today-'))).toBe(true)

        const overduePlan = plans.find(plan => plan.identifier.includes('-overdue-'))
        expect(overduePlan).toBeDefined()
        expect(overduePlan?.when.getTime()).toBe(new Date(2026, 4, 24, 10, 0, 0, 0).getTime())
    })

    it('does not create overdue reminders for items that are already overdue', () => {
        const now = new Date(2026, 4, 23, 11, 0, 0, 0)

        const plans = buildLocalNotificationPlan(
            {
                plannedCocktails: [
                    makePlannedCocktail({
                        plannedFor: isoAtLocal(2026, 4, 22, 19),
                    }),
                ],
                plannedCollections: [],
                pantryItems: [],
            },
            now
        )

        expect(plans.some(plan => plan.identifier.includes('-overdue-'))).toBe(false)
    })

    it('creates a gentle restock reminder when low stock exists', () => {
        const now = new Date(2026, 4, 23, 9, 0, 0, 0)

        const plans = buildLocalNotificationPlan(
            {
                plannedCocktails: [],
                plannedCollections: [],
                pantryItems: [
                    makePantryItem({ quantity: 5, unitLeft: 'ml' }),
                    makePantryItem({ id: 'item-2', quantity: 1, unitLeft: 'pcs' }),
                ],
            },
            now
        )

        const restockPlan = plans.find(plan => plan.identifier.includes('-restock-'))
        expect(restockPlan).toBeDefined()
        expect(restockPlan?.route).toBe('/(tabs)/pantry')
        expect(restockPlan?.when.getHours()).toBe(18)
        expect(restockPlan?.when.getDate()).toBe(now.getDate())
    })
})
