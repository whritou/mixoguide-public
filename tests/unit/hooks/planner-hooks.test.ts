import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    mockInvalidators,
    mockPlannedCocktailsApi,
    mockPlannedCollectionsApi,
    mockQueryClient,
    mockUseSession,
    mockUseMutation,
    mockUseQueries,
    mockUseQuery,
    mockUseQueryClient,
} = vi.hoisted(() => {
    const queryClient = {
        cancelQueries: vi.fn(),
        getQueriesData: vi.fn(() => []),
        getQueryData: vi.fn(),
        invalidateQueries: vi.fn(),
        setQueriesData: vi.fn(),
        setQueryData: vi.fn(),
    }

    return {
        mockInvalidators: {
            cocktailMade: vi.fn(),
            plannedCocktails: vi.fn(),
            plannedCollectionComplete: vi.fn(),
        },
        mockPlannedCocktailsApi: {
            list: vi.fn(),
            exists: vi.fn(),
            create: vi.fn(),
            remove: vi.fn(),
            update: vi.fn(),
            complete: vi.fn(),
        },
        mockPlannedCollectionsApi: {
            list: vi.fn(),
            get: vi.fn(),
            grocery: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
            complete: vi.fn(),
            addCocktail: vi.fn(),
            completeCocktail: vi.fn(),
            removeCocktail: vi.fn(),
        },
        mockQueryClient: queryClient,
        mockUseSession: vi.fn(() => ({
            data: { user: { id: 'user-1' } },
            status: 'authenticated',
        })),
        mockUseMutation: vi.fn(),
        mockUseQueries: vi.fn(() => []),
        mockUseQuery: vi.fn(),
        mockUseQueryClient: vi.fn(() => queryClient),
    }
})

vi.mock('@tanstack/react-query', () => ({
    useMutation: mockUseMutation,
    useQueries: mockUseQueries,
    useQuery: mockUseQuery,
    useQueryClient: mockUseQueryClient,
}))
vi.mock('next-auth/react', () => ({
    useSession: mockUseSession,
}))

vi.mock('@/lib/api/planned-cocktails.api', () => ({ plannedCocktailsApi: mockPlannedCocktailsApi }))
vi.mock('@/lib/api/planned-collections.api', () => ({ plannedCollectionsApi: mockPlannedCollectionsApi }))
vi.mock('@/lib/invalidation', () => ({ invalidators: mockInvalidators }))

import { queryKeys } from '@/lib/query-keys'
import {
    useGroceryList,
    useMyRsvpsQuery,
    usePlannedCollectionQuery,
    usePlannedCollectionsQuery,
} from '@/hooks/queries/use-planned-collections'
import {
    usePlannedCocktailExists,
    usePlannedCocktailsQuery,
} from '@/hooks/queries/use-planned-cocktails'
import { usePlannedCocktailMutations } from '@/hooks/mutations/use-planned-cocktail-mutations'
import { usePlannedCollectionMutations } from '@/hooks/mutations/use-planned-collection-mutations'

type QueryOptions = {
    queryKey: unknown
    queryFn: () => Promise<unknown>
    enabled?: boolean
}

type MutationOptions = {
    mutationFn: (value: unknown) => Promise<unknown>
    onMutate?: (value: unknown) => Promise<unknown>
    onError?: (...args: unknown[]) => unknown
    onSettled?: (...args: unknown[]) => unknown
}

beforeEach(() => {
    mockUseQuery.mockImplementation((options: QueryOptions) => ({ data: undefined, isLoading: false, options }))
    mockUseMutation.mockImplementation((options: MutationOptions) => ({
        ...options,
        mutateAsync: (value: unknown) => options.mutationFn(value),
    }))
    mockUseQueryClient.mockReturnValue(mockQueryClient)
    mockUseSession.mockReturnValue({
        data: { user: { id: 'user-1' } },
        status: 'authenticated',
    })
})

describe('planned query hooks', () => {
    it('registers planned cocktails list query with params', async () => {
        const payload = { items: [{ id: 'planned-1' }], meta: { total: 1 } }
        mockPlannedCocktailsApi.list.mockResolvedValueOnce(payload)

        const result = usePlannedCocktailsQuery({ status: 'planned', limit: 10 }) as unknown as { options: QueryOptions }

        expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
            queryKey: queryKeys.plannedCocktails.list({ status: 'planned', limit: 10 }),
            enabled: true,
        }))
        await expect(result.options.queryFn()).resolves.toBe(payload)
    })

    it('disables planned cocktail exists query when id is empty', () => {
        usePlannedCocktailExists('')

        expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
            queryKey: queryKeys.plannedCocktails.exists(''),
            enabled: false,
        }))
    })

    it('registers planned collections detail and grocery queries', async () => {
        const collection = { id: 'collection-1' }
        const grocery = [{ ingredientId: 'gin' }]
        mockPlannedCollectionsApi.get.mockResolvedValueOnce(collection)
        mockPlannedCollectionsApi.grocery.mockResolvedValueOnce(grocery)

        const detail = usePlannedCollectionQuery('collection-1') as unknown as { options: QueryOptions }
        const groceryResult = useGroceryList('collection-1') as unknown as { options: QueryOptions }

        await expect(detail.options.queryFn()).resolves.toBe(collection)
        await expect(groceryResult.options.queryFn()).resolves.toBe(grocery)
    })

    it('maps RSVP fetch failures to a typed error', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'unavailable' }),
        } as Response)

        const result = useMyRsvpsQuery() as unknown as { options: QueryOptions }

        await expect(result.options.queryFn()).rejects.toThrow('Failed to load RSVPs')
    })
})

describe('planned mutation hooks', () => {
    it('optimistically removes a planned cocktail and rolls back on error', async () => {
        const previous = {
            items: [{ id: 'planned-1' }, { id: 'planned-2' }],
            meta: { total: 2 },
        }
        mockQueryClient.getQueriesData.mockReturnValueOnce([[queryKeys.plannedCocktails.list({}), previous]] as never)

        const hooks = usePlannedCocktailMutations()
        const removeMutation = hooks.remove as unknown as {
            onMutate: (id: string) => Promise<{ snapshots: Array<[unknown, unknown]> }>
            onError: (error: Error, id: string, ctx: { snapshots: Array<[unknown, unknown]> }) => void
            onSettled: () => void
        }

        const context = await removeMutation.onMutate('planned-1')
        removeMutation.onError(new Error('write failed'), 'planned-1', context)
        removeMutation.onSettled()

        expect(mockQueryClient.cancelQueries).toHaveBeenCalledWith({ queryKey: queryKeys.plannedCocktails.lists() })
        expect(mockQueryClient.setQueriesData).toHaveBeenCalled()
        expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(queryKeys.plannedCocktails.list({}), previous)
        expect(mockInvalidators.plannedCocktails).toHaveBeenCalledWith(mockQueryClient)
    })

    it('invalidates dependent caches when completing planned cocktail', () => {
        const hooks = usePlannedCocktailMutations()
        const completeMutation = hooks.complete as unknown as {
            onSettled: (_d: unknown, _e: unknown, vars: { id: string; cocktailId: string }) => void
        }

        completeMutation.onSettled(undefined, undefined, { id: 'planned-1', cocktailId: 'cocktail-1' })

        expect(mockInvalidators.cocktailMade).toHaveBeenCalledWith(mockQueryClient, 'cocktail-1')
    })

    it('routes planned collection completion through plannedCollectionComplete invalidator', () => {
        const hooks = usePlannedCollectionMutations()
        const completeMutation = hooks.complete as unknown as {
            onSettled: (_d: unknown, _e: unknown, id: string) => void
        }

        completeMutation.onSettled(undefined, undefined, 'collection-1')

        expect(mockInvalidators.plannedCollectionComplete).toHaveBeenCalledWith(mockQueryClient, 'collection-1')
    })

    it('routes single collection cocktail completion through plannedCollectionComplete invalidator', () => {
        const hooks = usePlannedCollectionMutations()
        const completeCocktailMutation = hooks.completeCocktail as unknown as {
            onSettled: (_d: unknown, _e: unknown, vars: { id: string; cocktailId: string }) => void
        }

        completeCocktailMutation.onSettled(undefined, undefined, { id: 'collection-1', cocktailId: 'cocktail-1' })

        expect(mockInvalidators.plannedCollectionComplete).toHaveBeenCalledWith(mockQueryClient, 'collection-1')
    })

    it('registers planned collections list query with enabled override', async () => {
        const payload = { items: [], meta: { total: 0 } }
        mockPlannedCollectionsApi.list.mockResolvedValueOnce(payload)

        const result = usePlannedCollectionsQuery({ status: 'planned' }, { enabled: false }) as unknown as { options: QueryOptions }

        expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
            queryKey: queryKeys.plannedCollections.list({ status: 'planned' }),
            enabled: false,
        }))
        await expect(result.options.queryFn()).resolves.toBe(payload)
    })
})
