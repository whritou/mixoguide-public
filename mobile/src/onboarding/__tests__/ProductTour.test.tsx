import React from 'react'
import { Text } from 'react-native'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import type { CocktailDTO } from '@mixoguide/shared'
import { ProductTourProvider, useProductTour, type ProductTourContextValue } from '../ProductTour'
import { markFeatureTourV2Complete } from '@/auth/tokenStore'
import { router } from 'expo-router'

jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
        replace: jest.fn(),
    },
    useSegments: jest.fn(() => ['(tabs)']),
}))

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock('@expo/vector-icons', () => ({
    Ionicons: () => null,
}))

jest.mock('@/auth/useAuth', () => ({
    useAuth: jest.fn(),
}))

jest.mock('@/auth/tokenStore', () => ({
    hasCompletedFeatureTourV2: jest.fn(() => Promise.resolve(false)),
    markFeatureTourV2Complete: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/features/cocktails/hooks', () => ({
    useCocktails: jest.fn(),
    useFavoriteIds: jest.fn(),
}))

jest.mock('@/features/pantry/hooks', () => ({
    usePantryItems: jest.fn(),
}))

jest.mock('@/features/planner/hooks', () => ({
    usePlannedCocktails: jest.fn(),
    usePlannedCollections: jest.fn(),
}))

const { useAuth } = require('@/auth/useAuth')
const cocktailHooks = require('@/features/cocktails/hooks')
const pantryHooks = require('@/features/pantry/hooks')
const plannerHooks = require('@/features/planner/hooks')

function makeCocktail(id: string, name: string): CocktailDTO {
    return {
        id,
        name,
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
        avgRating: 4.6,
        ratingCount: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ingredients: [
            {
                ingredientId: `${id}-spirit`,
                amount: 2,
                unit: 'oz',
                optional: false,
                substitutes: [],
                ingredient: {
                    id: `${id}-spirit`,
                    name: 'White rum',
                    imageUrl: null,
                    isAlcoholic: true,
                    abv: 40,
                    type: { name: 'Spirit' },
                    subType: null,
                },
            },
            {
                ingredientId: `${id}-juice`,
                amount: 1,
                unit: 'oz',
                optional: false,
                substitutes: [],
                ingredient: {
                    id: `${id}-juice`,
                    name: 'Lime juice',
                    imageUrl: null,
                    isAlcoholic: false,
                    abv: null,
                    type: { name: 'Juice' },
                    subType: null,
                },
            },
        ],
    }
}

function mockDefaultHooks(overrides: {
    favoriteIds?: string[]
    pantryItems?: unknown[]
    plannedCocktails?: unknown[]
    plannedCollections?: unknown[]
} = {}) {
    useAuth.mockReturnValue({ user: { id: 'user-1' }, isLoading: false })
    cocktailHooks.useCocktails.mockReturnValue({
        data: { data: [makeCocktail('one', 'Daiquiri'), makeCocktail('two', 'Margarita'), makeCocktail('three', 'Negroni')] },
        isLoading: false,
    })
    cocktailHooks.useFavoriteIds.mockReturnValue({ data: overrides.favoriteIds ?? [], isLoading: false })
    pantryHooks.usePantryItems.mockReturnValue({ data: overrides.pantryItems ?? [], isLoading: false })
    plannerHooks.usePlannedCocktails.mockReturnValue({ data: overrides.plannedCocktails ?? [], isLoading: false })
    plannerHooks.usePlannedCollections.mockReturnValue({ data: overrides.plannedCollections ?? [], isLoading: false })
}

let tourApi: ProductTourContextValue | null = null

function TourProbe() {
    tourApi = useProductTour()
    return <Text testID="tour-step">{tourApi.step ?? 'inactive'}</Text>
}

describe('ProductTourProvider real-screen guide', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        tourApi = null
        mockDefaultHooks()
    })

    it('does not auto-start when the user already has onboarding data', async () => {
        mockDefaultHooks({ favoriteIds: ['one'] })

        const screen = render(<ProductTourProvider><Text>Real app</Text></ProductTourProvider>)

        await waitFor(() => {
            expect(screen.queryByText('Choose any cocktail')).toBeNull()
            expect(router.replace).not.toHaveBeenCalled()
        })
    })

    it('auto-starts empty users on the real Cocktails screen without hiding children', async () => {
        const screen = render(
            <ProductTourProvider>
                <Text>Real app stays mounted</Text>
            </ProductTourProvider>
        )

        await waitFor(() => {
            expect(router.replace).toHaveBeenCalledWith('/(tabs)/cocktails')
            expect(screen.getByText('Choose any cocktail')).toBeTruthy()
            expect(screen.getByText('Real app stays mounted')).toBeTruthy()
        })

        expect(screen.queryByLabelText('Choose Daiquiri')).toBeNull()
    })

    it('advances only when real-screen callbacks report success', async () => {
        const screen = render(
            <ProductTourProvider>
                <TourProbe />
            </ProductTourProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('tour-step').props.children).toBe('pick')
        })

        act(() => {
            tourApi!.selectCocktail(makeCocktail('one', 'Daiquiri'))
        })

        expect(router.push).toHaveBeenCalledWith('/cocktail/one')
        expect(screen.getByTestId('tour-step').props.children).toBe('favorite')

        act(() => {
            tourApi!.advanceFavorite('other')
        })
        expect(screen.getByTestId('tour-step').props.children).toBe('favorite')

        act(() => {
            tourApi!.advanceFavorite('one')
        })
        expect(screen.getByTestId('tour-step').props.children).toBe('plan')

        act(() => {
            tourApi!.advancePlanned(makeCocktail('one', 'Daiquiri'), 'planned-1', 2)
        })
        expect(screen.getByTestId('tour-step').props.children).toBe('stock')
        expect(tourApi!.stockItems).toHaveLength(2)

        act(() => {
            tourApi!.advanceStocked()
        })
        expect(screen.getByTestId('tour-step').props.children).toBe('make')
        expect(router.replace).toHaveBeenCalledWith('/(tabs)/planner')

        await act(async () => {
            await tourApi!.advanceMade('wrong-plan')
        })
        expect(screen.getByTestId('tour-step').props.children).toBe('make')
        expect(markFeatureTourV2Complete).not.toHaveBeenCalled()

        await act(async () => {
            await tourApi!.advanceMade('planned-1')
        })
        expect(screen.getByTestId('tour-step').props.children).toBe('done')
        expect(markFeatureTourV2Complete).toHaveBeenCalledTimes(1)
    })

    it('finish hides the guide after completion', async () => {
        const screen = render(
            <ProductTourProvider>
                <TourProbe />
            </ProductTourProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('tour-step').props.children).toBe('pick')
        })

        act(() => {
            tourApi!.selectCocktail(makeCocktail('one', 'Daiquiri'))
        })
        act(() => {
            tourApi!.advanceFavorite('one')
        })
        act(() => {
            tourApi!.advancePlanned(makeCocktail('one', 'Daiquiri'), 'planned-1', 1)
        })
        act(() => {
            tourApi!.advanceStocked()
        })
        await act(async () => {
            await tourApi!.advanceMade('planned-1')
        })

        fireEvent.press(screen.getByText('Finish'))

        await waitFor(() => {
            expect(screen.getByTestId('tour-step').props.children).toBe('inactive')
        })
    })
})
