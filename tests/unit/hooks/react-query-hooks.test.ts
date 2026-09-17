import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    mockCocktailsApi,
    mockFavoritesApi,
    mockInvalidators,
    mockPantryApi,
    mockQueryClient,
    mockUseMutation,
    mockUseQuery,
    mockUseQueryClient,
} = vi.hoisted(() => {
    const queryClient = {
        cancelQueries:   vi.fn(),
        getQueriesData:  vi.fn(() => []),
        getQueryData:    vi.fn(),
        invalidateQueries: vi.fn(),
        setQueriesData:  vi.fn(),
        setQueryData:    vi.fn(),
    }

    return {
        mockCocktailsApi: { list: vi.fn() },
        mockFavoritesApi: { add: vi.fn(), list: vi.fn(), remove: vi.fn() },
        mockInvalidators: { favorites: vi.fn(), pantry: vi.fn() },
        mockPantryApi: { add: vi.fn(), moveToPantry: vi.fn(), remove: vi.fn(), update: vi.fn() },
        mockQueryClient: queryClient,
        mockUseMutation: vi.fn(),
        mockUseQuery: vi.fn(),
        mockUseQueryClient: vi.fn(() => queryClient),
    }
})

vi.mock('@tanstack/react-query', () => ({
    useMutation: mockUseMutation,
    useQuery: mockUseQuery,
    useQueryClient: mockUseQueryClient,
}))

vi.mock('@/lib/api/cocktails.api', () => ({ cocktailsApi: mockCocktailsApi }))
vi.mock('@/lib/api/favorites.api', () => ({ favoritesApi: mockFavoritesApi }))
vi.mock('@/lib/api/pantry.api', () => ({ pantryApi: mockPantryApi }))
vi.mock('@/lib/invalidation', () => ({ invalidators: mockInvalidators }))

import { queryKeys } from '@/lib/query-keys'
import { useCocktailsQuery } from '@/hooks/queries/use-cocktails'
import { usePantryMutations } from '@/hooks/mutations/use-pantry-mutations'
import { useFavorites } from '@/hooks/useFavorite'

type MutationOptions = {
    mutationFn: (value: unknown) => Promise<unknown>
    onError?: (...args: unknown[]) => unknown
    onMutate?: (...args: unknown[]) => unknown
    onSettled?: (...args: unknown[]) => unknown
}

beforeEach(() => {
    mockUseQuery.mockImplementation((options) => ({ options, data: undefined, isLoading: false }))
    mockUseMutation.mockImplementation((options: MutationOptions) => ({
        ...options,
        mutateAsync: (value: unknown) => options.mutationFn(value),
    }))
    mockUseQueryClient.mockReturnValue(mockQueryClient)
    mockQueryClient.getQueryData.mockReturnValue([])
})

describe('useCocktailsQuery', () => {
    it('registers the cocktail list query and resolves its query function', async () => {
        const payload = { items: [{ id: 'cocktail-1', name: 'A1' }], meta: { total: 1 } }
        mockCocktailsApi.list.mockResolvedValueOnce(payload)

        const result = useCocktailsQuery({ search: 'gin', limit: 10 }) as unknown as { options: { queryKey: unknown; queryFn: () => Promise<unknown> } }

        expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
            queryKey: queryKeys.cocktails.list({ search: 'gin', limit: 10 }),
        }))
        await expect(result.options.queryFn()).resolves.toBe(payload)
        expect(mockCocktailsApi.list).toHaveBeenCalledWith({ search: 'gin', limit: 10 })
    })

    it('surfaces query function failures', async () => {
        const failure = new Error('network down')
        mockCocktailsApi.list.mockRejectedValueOnce(failure)

        const result = useCocktailsQuery({ limit: 5 }) as unknown as { options: { queryFn: () => Promise<unknown> } }

        await expect(result.options.queryFn()).rejects.toThrow('network down')
    })
})

describe('usePantryMutations', () => {
    it('adds a pantry item through pantryApi and invalidates pantry caches on settle', async () => {
        const created = { id: 'pantry-1' }
        mockPantryApi.add.mockResolvedValueOnce(created)

        const mutations = usePantryMutations()
        const addMutation = mutations.add as unknown as { mutateAsync: (value: unknown) => Promise<unknown>; onSettled?: () => unknown }
        await expect(mutations.add.mutateAsync({
            ingredientId: 'ingredient-1',
            quantity: 1,
            unitLeft: 'pcs',
            isInPantry: true,
        })).resolves.toBe(created)

        addMutation.onSettled?.()

        expect(mockPantryApi.add).toHaveBeenCalledWith(expect.objectContaining({ ingredientId: 'ingredient-1' }))
        expect(mockInvalidators.pantry).toHaveBeenCalledWith(mockQueryClient)
    })

    it('rolls optimistic pantry updates back when an update fails', async () => {
        const previous = { items: [{ id: 'pantry-1', quantity: 1 }], meta: {} }
        mockQueryClient.getQueriesData.mockReturnValueOnce([[queryKeys.pantry.list({}), previous]] as never)
        mockPantryApi.update.mockRejectedValueOnce(new Error('write failed'))

        const mutations = usePantryMutations()
        const updateMutation = mutations.update as unknown as {
            onMutate?: (value: unknown) => Promise<unknown>
            onError?: (...args: unknown[]) => unknown
        }
        const context = await updateMutation.onMutate?.({ id: 'pantry-1', data: { quantity: 5 } })

        updateMutation.onError?.(new Error('write failed'), { id: 'pantry-1', data: { quantity: 5 } }, context)

        expect(mockQueryClient.cancelQueries).toHaveBeenCalledWith({ queryKey: queryKeys.pantry.all })
        expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(queryKeys.pantry.list({}), previous)
    })
})

describe('useFavorites', () => {
    it('returns favorite ids and toggles an existing favorite off', async () => {
        mockUseQuery.mockReturnValueOnce({ data: ['cocktail-1'], isLoading: false })
        mockQueryClient.getQueryData.mockReturnValueOnce(['cocktail-1'])
        mockFavoritesApi.remove.mockResolvedValueOnce(undefined)

        const favorites = useFavorites()
        await favorites.toggle('cocktail-1')

        expect(favorites.ids).toEqual(['cocktail-1'])
        expect(favorites.isFavorite('cocktail-1')).toBe(true)
        expect(mockFavoritesApi.remove).toHaveBeenCalledWith('cocktail-1')
    })

    it('falls back to an empty favorite list when the query has no data', () => {
        mockUseQuery.mockReturnValueOnce({ data: undefined, error: new Error('offline'), isLoading: false })

        const favorites = useFavorites()

        expect(favorites.ids).toEqual([])
        expect(favorites.isFavorite('cocktail-1')).toBe(false)
    })
})
