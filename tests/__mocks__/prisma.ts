import { vi } from 'vitest'

function delegateMock() {
    return {
        aggregate:  vi.fn(),
        count:      vi.fn(),
        create:     vi.fn(),
        createMany: vi.fn(),
        delete:     vi.fn(),
        deleteMany: vi.fn(),
        findFirst:  vi.fn(),
        findMany:   vi.fn(),
        findUnique: vi.fn(),
        groupBy:    vi.fn(),
        update:     vi.fn(),
        updateMany: vi.fn(),
        upsert:     vi.fn(),
    }
}

export function createPrismaMock() {
    const mock = {
        $connect:    vi.fn(),
        $disconnect: vi.fn(),
        $executeRaw: vi.fn(),
        $queryRaw:   vi.fn(),
        $transaction: vi.fn(async (input: unknown) => {
            if (typeof input === 'function') return input(mock)
            return Array.isArray(input) ? Promise.all(input) : input
        }),
        account:                  delegateMock(),
        barTool:                  delegateMock(),
        cocktail:                 delegateMock(),
        cocktailBarTool:          delegateMock(),
        cocktailIngredient:       delegateMock(),
        cocktailMadeLog:          delegateMock(),
        glass:                    delegateMock(),
        ingredient:               delegateMock(),
        ingredientDerivative:     delegateMock(),
        ingredientSubType:        delegateMock(),
        ingredientType:           delegateMock(),
        plannedCocktail:          delegateMock(),
        plannedCollection:        delegateMock(),
        plannedCollectionCocktail: delegateMock(),
        rating:                   delegateMock(),
        session:                  delegateMock(),
        suggestion:               delegateMock(),
        user:                     delegateMock(),
        userFavoriteCocktail:     delegateMock(),
        userPantryItem:           delegateMock(),
        verificationToken:        delegateMock(),
    }

    return mock
}

export const prismaMock = createPrismaMock()
export type PrismaMock = ReturnType<typeof createPrismaMock>
