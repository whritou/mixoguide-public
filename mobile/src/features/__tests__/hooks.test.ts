// @ts-nocheck
import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import {
    useCocktail,
    useCocktails,
    useDerivations,
    useFavoriteIds,
    useInfiniteCocktails,
    useMakeableCocktails,
    useMakeNow,
    useToggleFavorite,
    useUpsertRating,
    useUserRating,
} from '@/features/cocktails/hooks'
import {
    useIngredient,
    useIngredients,
    useIngredientSubTypes,
    useIngredientTypes,
    useInfiniteIngredients,
} from '@/features/ingredients/hooks'
import {
    useAddPantryItem,
    useDeletePantryItem,
    useIngredientSearch,
    useMoveToPantry,
    usePantryItems,
    useRestockPantryItems,
    useUpdatePantryItem,
} from '@/features/pantry/hooks'
import {
    useAddCocktailToCollection,
    useCompleteCollectionCocktail,
    useCompletePlannedCocktail,
    useCompletePlannedCollection,
    useCreatePlannedCocktail,
    useCreatePlannedCollection,
    useDeletePlannedCocktail,
    useDeletePlannedCollection,
    useGroceryList,
    usePlannedCocktails,
    usePlannedCollection,
    usePlannedCollections,
    useRemoveCocktailFromCollection,
    useUpdatePlannedCocktail,
} from '@/features/planner/hooks'
import {
    useChangePassword,
    useDeleteAccount,
    useProfile,
    useUpdateProfile,
    useUserStats,
} from '@/features/profile/hooks'
import { useCreateSuggestion } from '@/features/suggestions/hooks'
import { keys } from '@/lib/query-keys'
import { noteRatePromptEligibleAction } from '@/lib/ratePrompt'
import { cocktailsApi } from '@/api/endpoints/cocktails'
import { derivationsApi } from '@/api/endpoints/derivations'
import { ingredientsApi, ingredientSubTypesApi, ingredientTypesApi } from '@/api/endpoints/ingredients'
import { pantryApi } from '@/api/endpoints/pantry'
import { plannedCocktailsApi, plannedCollectionsApi } from '@/api/endpoints/planner'
import { userApi } from '@/api/endpoints/user'
import { suggestionsApi } from '@/api/endpoints/suggestions'

jest.mock('@tanstack/react-query', () => ({
    useQuery: jest.fn(),
    useInfiniteQuery: jest.fn(),
    useMutation: jest.fn(),
    useQueryClient: jest.fn(),
}))

jest.mock('@/auth/useAuth', () => ({
    useAuth: jest.fn(),
}))

jest.mock('@/lib/ratePrompt', () => ({
    noteRatePromptEligibleAction: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/api/endpoints/cocktails', () => ({
    cocktailsApi: {
        list: jest.fn(),
        getById: jest.fn(),
        getFavoriteIds: jest.fn(),
        addFavorite: jest.fn(),
        removeFavorite: jest.fn(),
        getUserRating: jest.fn(),
        upsertRating: jest.fn(),
        deleteRating: jest.fn(),
        makeable: jest.fn(),
        makeNow: jest.fn(),
    },
}))

jest.mock('@/api/endpoints/derivations', () => ({
    derivationsApi: { get: jest.fn() },
}))

jest.mock('@/api/endpoints/ingredients', () => ({
    ingredientsApi: {
        list: jest.fn(),
        getById: jest.fn(),
        search: jest.fn(),
    },
    ingredientTypesApi: { list: jest.fn() },
    ingredientSubTypesApi: { list: jest.fn() },
}))

jest.mock('@/api/endpoints/pantry', () => ({
    pantryApi: {
        list: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        moveToPantry: jest.fn(),
        restock: jest.fn(),
    },
}))

jest.mock('@/api/endpoints/planner', () => ({
    plannedCocktailsApi: {
        list: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        complete: jest.fn(),
    },
    plannedCollectionsApi: {
        list: jest.fn(),
        getById: jest.fn(),
        getGroceryList: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        complete: jest.fn(),
        addCocktail: jest.fn(),
        completeCocktail: jest.fn(),
        removeCocktail: jest.fn(),
    },
}))

jest.mock('@/api/endpoints/user', () => ({
    userApi: {
        getStats: jest.fn(),
        getProfile: jest.fn(),
        updateProfile: jest.fn(),
        changePassword: jest.fn(),
        deleteAccount: jest.fn(),
    },
}))

jest.mock('@/api/endpoints/suggestions', () => ({
    suggestionsApi: { create: jest.fn() },
}))

const useQueryMock = useQuery as jest.Mock
const useInfiniteQueryMock = useInfiniteQuery as jest.Mock
const useMutationMock = useMutation as jest.Mock
const useQueryClientMock = useQueryClient as jest.Mock
const useAuthMock = useAuth as jest.Mock

describe('mobile feature hooks', () => {
    const cancelQueries = jest.fn(() => Promise.resolve())
    const getQueryData = jest.fn()
    const invalidateQueries = jest.fn()
    const setQueryData = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        useAuthMock.mockReturnValue({ user: { id: 'user-1' } })
        useQueryMock.mockImplementation((config) => config)
        useInfiniteQueryMock.mockImplementation((config) => config)
        useMutationMock.mockImplementation((config) => config)
        useQueryClientMock.mockReturnValue({
            cancelQueries,
            getQueryData,
            invalidateQueries,
            setQueryData,
        })
    })

    it('builds cocktail/ingredient queries and pagination helpers', async () => {
        ;(cocktailsApi.list as jest.Mock).mockResolvedValue({ data: { data: [{ id: 'c1' }], meta: { page: 1, totalPages: 2 } } })
        ;(cocktailsApi.getById as jest.Mock).mockResolvedValue({ data: { data: { id: 'c1' } } })
        ;(cocktailsApi.getFavoriteIds as jest.Mock).mockResolvedValue({ data: { data: ['c1'] } })
        ;(cocktailsApi.getUserRating as jest.Mock).mockResolvedValue({ data: { data: { ratings: [{ userId: 'user-1', rating: 4 }] } } })
        ;(cocktailsApi.makeable as jest.Mock).mockResolvedValue({ data: { data: [{ id: 'mk1' }] } })
        ;(derivationsApi.get as jest.Mock).mockResolvedValue({ data: [] })
        ;(ingredientsApi.list as jest.Mock).mockResolvedValue({ data: { data: [{ id: 'i1' }], meta: { page: 1, totalPages: 2 } } })
        ;(ingredientsApi.getById as jest.Mock).mockResolvedValue({ data: { data: { id: 'i1' } } })
        ;(ingredientTypesApi.list as jest.Mock).mockResolvedValue({ data: { data: [{ id: 't1' }] } })
        ;(ingredientSubTypesApi.list as jest.Mock).mockResolvedValue({ data: { data: [{ id: 'st1' }] } })

        const cocktailsQuery = useCocktails({ q: 'gin' }, false)
        expect(cocktailsQuery.enabled).toBe(false)
        await expect(cocktailsQuery.queryFn()).resolves.toEqual({ data: [{ id: 'c1' }], meta: { page: 1, totalPages: 2 } })

        const infiniteCocktailsQuery = useInfiniteCocktails({ q: 'rum' })
        expect(infiniteCocktailsQuery.getNextPageParam({ data: [{ id: 'x' }], meta: { page: 1, totalPages: 2 } })).toBe(2)
        expect(infiniteCocktailsQuery.getNextPageParam({ data: [] })).toBeUndefined()
        expect(infiniteCocktailsQuery.getNextPageParam({ data: [{ id: 'x' }], meta: { page: Number.NaN, totalPages: 2 } })).toBeUndefined()
        expect(infiniteCocktailsQuery.getNextPageParam({ data: [{ id: 'x' }], meta: { page: 2, totalPages: 2 } })).toBeUndefined()

        const cocktailQuery = useCocktail('c1')
        await expect(cocktailQuery.queryFn()).resolves.toEqual({ id: 'c1' })
        expect(useCocktail('').enabled).toBe(false)

        const favoriteIdsQuery = useFavoriteIds()
        expect(favoriteIdsQuery.enabled).toBe(true)
        await expect(favoriteIdsQuery.queryFn()).resolves.toEqual(['c1'])
        useAuthMock.mockReturnValueOnce({ user: null })
        expect(useFavoriteIds().enabled).toBe(false)

        const ratingQuery = useUserRating('c1')
        await expect(ratingQuery.queryFn()).resolves.toBe(4)
        ;(cocktailsApi.getUserRating as jest.Mock).mockResolvedValueOnce({ data: { data: { ratings: [] } } })
        await expect(useUserRating('c1').queryFn()).resolves.toBeNull()
        expect(useUserRating('').enabled).toBe(false)

        const makeableQuery = useMakeableCocktails(4)
        await expect(makeableQuery.queryFn()).resolves.toEqual([{ id: 'mk1' }])
        useAuthMock.mockReturnValueOnce({ user: null })
        expect(useMakeableCocktails(2).enabled).toBe(false)

        const derivationsQuery = useDerivations()
        await expect(derivationsQuery.queryFn()).resolves.toEqual({ data: [] })

        const ingredientsQuery = useIngredients({ q: 'lemon' })
        await expect(ingredientsQuery.queryFn()).resolves.toEqual({ data: [{ id: 'i1' }], meta: { page: 1, totalPages: 2 } })

        const infiniteIngredientsQuery = useInfiniteIngredients({ q: 'orange' })
        expect(infiniteIngredientsQuery.getNextPageParam({ data: [{ id: 'x' }], meta: { page: 1, totalPages: 2 } })).toBe(2)
        expect(infiniteIngredientsQuery.getNextPageParam({ data: [], meta: { page: 1, totalPages: 2 } })).toBeUndefined()
        expect(infiniteIngredientsQuery.getNextPageParam({ data: [{ id: 'x' }], meta: { page: Number.NaN, totalPages: 2 } })).toBeUndefined()

        const ingredientQuery = useIngredient('ing-1')
        await expect(ingredientQuery.queryFn()).resolves.toEqual({ id: 'i1' })
        expect(useIngredient('').enabled).toBe(false)

        await expect(useIngredientTypes().queryFn()).resolves.toEqual([{ id: 't1' }])
        await expect(useIngredientSubTypes().queryFn()).resolves.toEqual([{ id: 'st1' }])
    })

    it('handles cocktails mutations including optimistic favorite and ratings', async () => {
        const toggleFavorite = useToggleFavorite()
        getQueryData.mockReturnValue(['c1'])
        const favoriteCtx = await toggleFavorite.onMutate({ cocktailId: 'c2', isFav: false })
        expect(cancelQueries).toHaveBeenCalledWith({ queryKey: keys.favorites.ids })
        expect(setQueryData).toHaveBeenCalledWith(keys.favorites.ids, ['c1', 'c2'])

        toggleFavorite.onError(new Error('fail'), { cocktailId: 'c2', isFav: false }, favoriteCtx)
        expect(setQueryData).toHaveBeenCalledWith(keys.favorites.ids, ['c1'])
        toggleFavorite.onError(new Error('fail'), { cocktailId: 'c2', isFav: false }, undefined)

        toggleFavorite.onSettled()
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.favorites.ids })

        ;(cocktailsApi.addFavorite as jest.Mock).mockResolvedValue({ ok: true })
        ;(cocktailsApi.removeFavorite as jest.Mock).mockResolvedValue({ ok: true })
        await toggleFavorite.mutationFn({ cocktailId: 'c1', isFav: false })
        await toggleFavorite.mutationFn({ cocktailId: 'c1', isFav: true })
        expect(cocktailsApi.addFavorite).toHaveBeenCalledWith('c1')
        expect(cocktailsApi.removeFavorite).toHaveBeenCalledWith('c1')

        const upsertRating = useUpsertRating()
        ;(cocktailsApi.upsertRating as jest.Mock).mockResolvedValue({ ok: true })
        ;(cocktailsApi.deleteRating as jest.Mock).mockResolvedValue({ ok: true })
        await upsertRating.mutationFn({ cocktailId: 'c1', rating: 5 })
        await upsertRating.mutationFn({ cocktailId: 'c1', rating: 0 })
        upsertRating.onSuccess({}, { cocktailId: 'c1', rating: 5 })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.ratings.byCocktail('c1') })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.cocktails.detail('c1') })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.stats.all })

        const makeNow = useMakeNow()
        ;(cocktailsApi.makeNow as jest.Mock).mockResolvedValue({ ok: true })
        await makeNow.mutationFn({ cocktailId: 'c1', quantity: 2 })
        makeNow.onSuccess()
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.pantry.items })
        expect(noteRatePromptEligibleAction).toHaveBeenCalled()
    })

    it('handles pantry mutations and optimistic rollbacks', async () => {
        const existing = [{ id: 'p1', ingredientId: 'ing-1', quantity: 10 }]
        getQueryData.mockReturnValue(existing)

        const pantryItems = usePantryItems(false)
        ;(pantryApi.list as jest.Mock).mockResolvedValue({ data: { data: existing } })
        expect(pantryItems.enabled).toBe(false)
        await expect(pantryItems.queryFn()).resolves.toEqual(existing)

        const add = useAddPantryItem()
        ;(pantryApi.upsert as jest.Mock).mockResolvedValue({ ok: true })
        await add.mutationFn({ ingredientId: 'ing-1', quantity: 20, unitLeft: 'ml' })
        add.onSuccess()
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.pantry.items })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.cocktails.makeable })

        const update = useUpdatePantryItem()
        const updateCtx = await update.onMutate({ id: 'p1', payload: { quantity: 15 } })
        expect(setQueryData).toHaveBeenCalledWith(keys.pantry.items, [{ id: 'p1', ingredientId: 'ing-1', quantity: 15 }])
        update.onError(new Error('fail'), { id: 'p1', payload: { quantity: 15 } }, updateCtx)
        expect(setQueryData).toHaveBeenCalledWith(keys.pantry.items, existing)
        update.onError(new Error('fail'), { id: 'p1', payload: { quantity: 10 } }, undefined)
        update.onSettled()

        const remove = useDeletePantryItem()
        const deleteCtx = await remove.onMutate('p1')
        expect(setQueryData).toHaveBeenCalledWith(keys.pantry.items, [])
        remove.onError(new Error('fail'), 'p1', deleteCtx)
        expect(setQueryData).toHaveBeenCalledWith(keys.pantry.items, existing)
        remove.onError(new Error('fail'), 'p1', undefined)
        remove.onSettled()

        const move = useMoveToPantry()
        ;(pantryApi.moveToPantry as jest.Mock).mockResolvedValue({ ok: true })
        await move.mutationFn({ ingredientId: 'ing-1', amount: 2, unitLeft: 'oz' })
        move.onSuccess()

        const restock = useRestockPantryItems()
        ;(pantryApi.restock as jest.Mock).mockResolvedValue({ ok: true })
        await restock.mutationFn([{ ingredientId: 'ing-1', amount: 3, unitLeft: 'ml' }])
        restock.onSuccess()

        const search = useIngredientSearch('lime', true)
        ;(ingredientsApi.search as jest.Mock).mockResolvedValue({ data: { data: [{ id: 'ing-2' }] } })
        await expect(search.queryFn()).resolves.toEqual([{ id: 'ing-2' }])
        expect(useIngredientSearch('lime', false).enabled).toBe(false)
    })

    it('handles planner query and mutation surfaces', async () => {
        ;(plannedCocktailsApi.list as jest.Mock).mockResolvedValue({ data: { data: [{ id: 'pc-1' }] } })
        ;(plannedCocktailsApi.list as jest.Mock).mockResolvedValueOnce({ data: { data: null } })
        ;(plannedCollectionsApi.list as jest.Mock).mockResolvedValue({ data: { data: [{ id: 'col-1' }] } })
        ;(plannedCollectionsApi.list as jest.Mock).mockResolvedValueOnce({ data: { data: null } })
        ;(plannedCollectionsApi.getById as jest.Mock).mockResolvedValue({ data: { data: { id: 'col-1' } } })
        ;(plannedCollectionsApi.getGroceryList as jest.Mock).mockResolvedValue({ data: { data: [{ ingredientName: 'Gin' }] } })

        await expect(usePlannedCocktails().queryFn()).resolves.toEqual([])
        await expect(usePlannedCocktails().queryFn()).resolves.toEqual([{ id: 'pc-1' }])
        await expect(usePlannedCollection('col-1').queryFn()).resolves.toEqual({ id: 'col-1' })
        expect(usePlannedCollection('').enabled).toBe(false)
        await expect(usePlannedCollections().queryFn()).resolves.toEqual([])
        await expect(usePlannedCollections().queryFn()).resolves.toEqual([{ id: 'col-1' }])
        await expect(useGroceryList('col-1').queryFn()).resolves.toEqual([{ ingredientName: 'Gin' }])
        expect(useGroceryList('').enabled).toBe(false)

        const createPlanned = useCreatePlannedCocktail()
        ;(plannedCocktailsApi.create as jest.Mock).mockResolvedValue({ ok: true })
        await createPlanned.mutationFn({ cocktailId: 'c1', plannedFor: '2026-05-26T10:00:00.000Z', quantity: 1 })
        createPlanned.onSuccess()

        getQueryData.mockReturnValue([{ id: 'pc-1' }, { id: 'pc-2' }])
        const deletePlanned = useDeletePlannedCocktail()
        const deletePlannedCtx = await deletePlanned.onMutate('pc-2')
        expect(setQueryData).toHaveBeenCalledWith(keys.plannedCocktails.list, [{ id: 'pc-1' }])
        deletePlanned.onError(new Error('fail'), 'pc-2', deletePlannedCtx)
        expect(setQueryData).toHaveBeenCalledWith(keys.plannedCocktails.list, [{ id: 'pc-1' }, { id: 'pc-2' }])
        deletePlanned.onError(new Error('fail'), 'pc-2', undefined)
        deletePlanned.onSettled()

        const updatePlanned = useUpdatePlannedCocktail()
        ;(plannedCocktailsApi.update as jest.Mock).mockResolvedValue({ ok: true })
        await updatePlanned.mutationFn({ id: 'pc-1', quantity: 2, status: 'done' })
        updatePlanned.onSuccess()

        const completePlanned = useCompletePlannedCocktail()
        ;(plannedCocktailsApi.complete as jest.Mock).mockResolvedValue({ ok: true })
        await completePlanned.mutationFn('pc-1')
        completePlanned.onSuccess()
        expect(noteRatePromptEligibleAction).toHaveBeenCalled()

        const createCollection = useCreatePlannedCollection()
        ;(plannedCollectionsApi.create as jest.Mock).mockResolvedValue({ ok: true })
        await createCollection.mutationFn({
            title: 'Friday',
            plannedFor: '2026-05-26T10:00:00.000Z',
            servings: 4,
            occasions: ['party'],
            cocktailIds: ['c1'],
        })
        createCollection.onSuccess()

        getQueryData.mockReturnValue([{ id: 'col-1' }, { id: 'col-2' }])
        const deleteCollection = useDeletePlannedCollection()
        const deleteCollectionCtx = await deleteCollection.onMutate('col-2')
        expect(setQueryData).toHaveBeenCalledWith(keys.plannedCollections.list, [{ id: 'col-1' }])
        deleteCollection.onError(new Error('fail'), 'col-2', deleteCollectionCtx)
        expect(setQueryData).toHaveBeenCalledWith(keys.plannedCollections.list, [{ id: 'col-1' }, { id: 'col-2' }])
        deleteCollection.onError(new Error('fail'), 'col-2', undefined)
        deleteCollection.onSettled()

        const completeCollection = useCompletePlannedCollection()
        ;(plannedCollectionsApi.complete as jest.Mock).mockResolvedValue({ ok: true })
        await completeCollection.mutationFn('col-1')
        completeCollection.onSuccess({}, 'col-1')
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.plannedCollections.detail('col-1') })

        const addCocktail = useAddCocktailToCollection()
        ;(plannedCollectionsApi.addCocktail as jest.Mock).mockResolvedValue({ ok: true })
        await addCocktail.mutationFn({ collectionId: 'col-1', cocktailId: 'c1' })
        addCocktail.onSuccess({}, { collectionId: 'col-1', cocktailId: 'c1' })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.plannedCollections.grocery('col-1') })

        const completeCollectionCocktail = useCompleteCollectionCocktail()
        ;(plannedCollectionsApi.completeCocktail as jest.Mock).mockResolvedValue({ ok: true })
        await completeCollectionCocktail.mutationFn({ collectionId: 'col-1', cocktailId: 'c1' })
        completeCollectionCocktail.onSuccess({}, { collectionId: 'col-1', cocktailId: 'c1' })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.plannedCollections.detail('col-1') })

        const removeCocktail = useRemoveCocktailFromCollection()
        ;(plannedCollectionsApi.removeCocktail as jest.Mock).mockResolvedValue({ ok: true })
        await removeCocktail.mutationFn({ collectionId: 'col-1', cocktailId: 'c1' })
        removeCocktail.onSuccess({}, { collectionId: 'col-1', cocktailId: 'c1' })
    })

    it('handles profile and suggestion surfaces', async () => {
        ;(userApi.getStats as jest.Mock).mockResolvedValue({ data: { data: { totalMade: 5 } } })
        ;(userApi.getProfile as jest.Mock).mockResolvedValue({ data: { data: { id: 'user-1', name: 'Ada' } } })
        ;(userApi.updateProfile as jest.Mock).mockResolvedValue({ ok: true })
        ;(userApi.changePassword as jest.Mock).mockResolvedValue({ ok: true })
        ;(userApi.deleteAccount as jest.Mock).mockResolvedValue({ ok: true })
        ;(suggestionsApi.create as jest.Mock).mockResolvedValue({ ok: true })

        await expect(useUserStats().queryFn()).resolves.toEqual({ totalMade: 5 })
        await expect(useProfile().queryFn()).resolves.toEqual({ id: 'user-1', name: 'Ada' })
        useAuthMock.mockReturnValueOnce({ user: null })
        expect(useUserStats().enabled).toBe(false)
        useAuthMock.mockReturnValueOnce({ user: null })
        expect(useProfile().enabled).toBe(false)

        const updateProfile = useUpdateProfile()
        await updateProfile.mutationFn({ name: 'New Name' })
        updateProfile.onSuccess()
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: keys.profile.me })

        const changePassword = useChangePassword()
        await changePassword.mutationFn({
            currentPassword: 'old',
            newPassword: 'new',
            confirmPassword: 'new',
        })
        expect(userApi.changePassword).toHaveBeenCalledWith('old', 'new', 'new')

        const deleteAccount = useDeleteAccount()
        await deleteAccount.mutationFn('password')
        expect(userApi.deleteAccount).toHaveBeenCalledWith('password')

        const createSuggestion = useCreateSuggestion()
        await createSuggestion.mutationFn({
            type: 'NEW_COCKTAIL',
            title: 'Negroni',
            content: 'Add Negroni recipe',
        })
        expect(suggestionsApi.create).toHaveBeenCalled()
    })
})
