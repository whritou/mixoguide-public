jest.mock('../../client', () => ({
    API_BASE_URL: 'https://mixoguide.test',
    api: {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}))

import { api } from '../../client'
import { authApi } from '../auth'
import { cocktailsApi } from '../cocktails'
import { derivationsApi } from '../derivations'
import { ingredientsApi, ingredientSubTypesApi, ingredientTypesApi } from '../ingredients'
import { pantryApi } from '../pantry'
import { plannedCocktailsApi, plannedCollectionsApi } from '../planner'
import { smartCollectionsApi } from '../smart-collections'
import { suggestionsApi } from '../suggestions'
import { userApi } from '../user'

const mockApi = api as unknown as {
    get: jest.Mock
    post: jest.Mock
    patch: jest.Mock
    put: jest.Mock
    delete: jest.Mock
}

describe('mobile endpoint wrappers', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockApi.get.mockResolvedValue({ data: { success: true, data: [] } })
        mockApi.post.mockResolvedValue({ data: { success: true, data: {} } })
        mockApi.patch.mockResolvedValue({ data: { success: true, data: {} } })
        mockApi.put.mockResolvedValue({ data: { success: true, data: {} } })
        mockApi.delete.mockResolvedValue({ data: { success: true } })
    })

    it('builds auth endpoint requests and Google ID-token login', () => {
        authApi.login('user@test.dev', 'password-1')
        authApi.register('user@test.dev', 'User', 'password-1')
        authApi.refresh('refresh-token')
        authApi.logout('refresh-token')
        authApi.requestReset('user@test.dev')
        authApi.resetPassword('token-1', 'new-pass', 'new-pass')
        authApi.googleIdToken('id-token-1')

        expect(mockApi.post).toHaveBeenCalledWith('/api/auth/mobile/login', { email: 'user@test.dev', password: 'password-1' })
        expect(mockApi.post).toHaveBeenCalledWith('/api/auth/mobile/register', { email: 'user@test.dev', name: 'User', password: 'password-1' })
        expect(mockApi.post).toHaveBeenCalledWith('/api/auth/mobile/refresh', { refreshToken: 'refresh-token' })
        expect(mockApi.post).toHaveBeenCalledWith('/api/auth/mobile/logout', { refreshToken: 'refresh-token' })
        expect(mockApi.post).toHaveBeenCalledWith('/api/auth/mobile/request-reset', { email: 'user@test.dev' })
        expect(mockApi.post).toHaveBeenCalledWith('/api/auth/mobile/reset-password', {
            token: 'token-1',
            password: 'new-pass',
            passwordConfirm: 'new-pass',
        })

        expect(mockApi.post).toHaveBeenCalledWith('/api/auth/mobile/oauth/google/id-token', { idToken: 'id-token-1' })
    })

    it('maps cocktail filters to list params and supports favorites/ratings', () => {
        cocktailsApi.list({
            search: 'negroni',
            difficulty: 'easy',
            isAlcoholic: true,
            flavors: ['bitter', 'citrus'],
            occasions: ['party'],
            onlyFavorites: true,
            favoriteIds: [],
            makeableIds: ['c1', 'c2'],
            sortBy: 'avgRating',
            sortOrder: 'desc',
            includeIngredients: true,
            page: 2,
            limit: 15,
        })
        cocktailsApi.getById('cocktail-1')
        cocktailsApi.makeable(2)
        cocktailsApi.getFavoriteIds()
        cocktailsApi.addFavorite('cocktail-1')
        cocktailsApi.removeFavorite('cocktail-1')
        cocktailsApi.upsertRating('cocktail-1', 5)
        cocktailsApi.deleteRating('cocktail-1')
        cocktailsApi.getUserRating('cocktail-1')
        cocktailsApi.makeNow('cocktail-1', 3)
        cocktailsApi.addIngredients('cocktail-1', [{ ingredientId: 'ing-1', destination: 'shopping', quantity: 2, unit: 'oz' }])

        expect(mockApi.get).toHaveBeenCalledWith('/api/cocktails', expect.objectContaining({
            params: expect.objectContaining({
                search: 'negroni',
                difficulty: 'easy',
                alcoholic: 'true',
                flavors: 'bitter,citrus',
                occasions: 'party',
                favoriteIds: '__none__',
                makeableIds: 'c1,c2',
                sortBy: 'avgRating',
                sortOrder: 'desc',
                include: 'ingredients',
                page: '2',
                limit: '15',
            }),
        }))
        expect(mockApi.get).toHaveBeenCalledWith('/api/cocktails/cocktail-1')
        expect(mockApi.get).toHaveBeenCalledWith('/api/cocktails/makeable', { params: { maxMissing: 2 } })
        expect(mockApi.post).toHaveBeenCalledWith('/api/user-favorites-cocktail', { cocktailId: 'cocktail-1' })
        expect(mockApi.delete).toHaveBeenCalledWith('/api/user-favorites-cocktail/cocktail-1')
        expect(mockApi.post).toHaveBeenCalledWith('/api/ratings/cocktail-1', { rating: 5 })
        expect(mockApi.delete).toHaveBeenCalledWith('/api/ratings/cocktail-1')
        expect(mockApi.post).toHaveBeenCalledWith('/api/cocktails/cocktail-1/make', { quantity: 3 })
    })

    it('covers default and empty cocktail filter branches', () => {
        cocktailsApi.list()
        cocktailsApi.list({
            onlyFavorites: true,
            favoriteIds: ['c9'],
            makeableIds: [],
            isAlcoholic: false,
            sortOrder: 'asc',
            page: 1,
            limit: 20,
        })

        expect(mockApi.get).toHaveBeenCalledWith('/api/cocktails', expect.objectContaining({
            params: { limit: '20' },
        }))
        expect(mockApi.get).toHaveBeenCalledWith('/api/cocktails', expect.objectContaining({
            params: expect.objectContaining({
                favoriteIds: 'c9',
                makeableIds: '__none__',
                alcoholic: 'false',
                sortOrder: 'asc',
                page: '1',
                limit: '20',
            }),
        }))
    })

    it('builds ingredient search and barcode endpoint requests', () => {
        ingredientsApi.list({
            search: 'gin',
            types: ['Spirit'],
            subTypes: ['London Dry Gin'],
            isAlcoholic: true,
            sortBy: 'abv',
            sortOrder: 'desc',
            page: 3,
            limit: 10,
            offset: 20,
        })
        ingredientsApi.getById('ingredient-1')
        ingredientsApi.search('  lime juice  ')
        ingredientsApi.lookupBarcode('0123-ABC')
        ingredientsApi.confirmBarcode('0123-ABC', 'ingredient-1')
        ingredientTypesApi.list()
        ingredientSubTypesApi.list()

        expect(mockApi.get).toHaveBeenCalledWith('/api/ingredients', expect.objectContaining({
            params: expect.objectContaining({
                search: 'gin',
                types: 'Spirit',
                subTypes: 'London Dry Gin',
                alcoholic: 'true',
                sortBy: 'abv',
                sortOrder: 'desc',
                page: 3,
                limit: 10,
                offset: 20,
            }),
        }))
        expect(mockApi.get).toHaveBeenCalledWith('/api/ingredients/ingredient-1')
        expect(mockApi.get).toHaveBeenCalledWith('/api/ingredients/by-barcode/0123-ABC')
        expect(mockApi.post).toHaveBeenCalledWith('/api/ingredients/by-barcode/0123-ABC', { ingredientId: 'ingredient-1' })
    })

    it('covers default and trimmed ingredient branch paths', () => {
        ingredientsApi.list()
        ingredientsApi.list({
            isAlcoholic: false,
            types: [],
            subTypes: [],
            offset: 0,
        })
        ingredientsApi.search('   ')
        ingredientsApi.search('orange peel', 5)

        expect(mockApi.get).toHaveBeenCalledWith('/api/ingredients', expect.objectContaining({
            params: { sortBy: 'name', sortOrder: 'asc', limit: 50 },
        }))
        expect(mockApi.get).toHaveBeenCalledWith('/api/ingredients', expect.objectContaining({
            params: expect.objectContaining({
                alcoholic: 'false',
                offset: 0,
            }),
        }))
        expect(mockApi.get).toHaveBeenCalledWith('/api/ingredients', {
            params: { limit: 20, sortBy: 'name', sortOrder: 'asc' },
        })
        expect(mockApi.get).toHaveBeenCalledWith('/api/ingredients', {
            params: { search: 'orange peel', limit: 5, sortBy: 'name', sortOrder: 'asc' },
        })
    })

    it('covers pantry CRUD, move, restock, and stats endpoints', () => {
        pantryApi.list()
        pantryApi.list({ page: 2, limit: 25 })
        pantryApi.upsert({ ingredientId: 'ingredient-1', quantity: 1, unitLeft: 'oz' })
        pantryApi.update('pantry-1', { quantity: 2 })
        pantryApi.delete('pantry-1')
        pantryApi.moveToPantry('ingredient-1', 2, 'oz')
        pantryApi.restock([{ ingredientId: 'ingredient-1', quantity: 3, unit: 'oz' }])
        pantryApi.stats()

        expect(mockApi.get).toHaveBeenCalledWith('/api/user-pantry-items', { params: { limit: 25, page: 2 } })
        expect(mockApi.get).toHaveBeenCalledWith('/api/user-pantry-items', { params: { limit: 500 } })
        expect(mockApi.post).toHaveBeenCalledWith('/api/user-pantry-items', { ingredientId: 'ingredient-1', quantity: 1, unitLeft: 'oz' })
        expect(mockApi.put).toHaveBeenCalledWith('/api/user-pantry-items/pantry-1', { quantity: 2 })
        expect(mockApi.delete).toHaveBeenCalledWith('/api/user-pantry-items/pantry-1')
        expect(mockApi.post).toHaveBeenCalledWith('/api/user-pantry-items/move-to-pantry', {
            ingredientId: 'ingredient-1',
            amount: 2,
            unitLeft: 'oz',
        })
        expect(mockApi.post).toHaveBeenCalledWith('/api/user-pantry-items/restock', {
            items: [{ ingredientId: 'ingredient-1', quantity: 3, unit: 'oz' }],
        })
        expect(mockApi.get).toHaveBeenCalledWith('/api/user-pantry-items/stats')
    })

    it('covers planner cocktails/collections and suggestion endpoints', () => {
        plannedCocktailsApi.list()
        plannedCocktailsApi.create({ cocktailId: 'cocktail-1', plannedFor: '2026-06-01T10:00:00.000Z', quantity: 2 })
        plannedCocktailsApi.update('planned-1', { quantity: 4 })
        plannedCocktailsApi.complete('planned-1')
        plannedCocktailsApi.delete('planned-1')

        plannedCollectionsApi.list()
        plannedCollectionsApi.getById('collection-1')
        plannedCollectionsApi.create({
            title: 'Party',
            plannedFor: '2026-06-10T19:00:00.000Z',
            servings: 6,
            occasions: ['party'],
            cocktailIds: ['cocktail-1'],
        })
        plannedCollectionsApi.update('collection-1', { title: 'Updated' })
        plannedCollectionsApi.complete('collection-1')
        plannedCollectionsApi.delete('collection-1')
        plannedCollectionsApi.addCocktail('collection-1', 'cocktail-2')
        plannedCollectionsApi.completeCocktail('collection-1', 'cocktail-2')
        plannedCollectionsApi.removeCocktail('collection-1', 'cocktail-2')
        plannedCollectionsApi.getGroceryList('collection-1')
        plannedCollectionsApi.addIngredients('collection-1', [
            { ingredientId: 'ingredient-1', destination: 'shopping', quantity: 2, unit: 'oz' },
        ])
        suggestionsApi.create({ type: 'NEW_COCKTAIL', title: 'Add Boulevardier', content: 'Please add this classic.' })

        expect(mockApi.get).toHaveBeenCalledWith('/api/planned-cocktails', {
            params: { sortBy: 'plannedFor', sortOrder: 'asc', limit: 100 },
        })
        expect(mockApi.post).toHaveBeenCalledWith('/api/planned-cocktails/planned-1/complete', {})
        expect(mockApi.get).toHaveBeenCalledWith('/api/planned-collections', {
            params: { sortBy: 'plannedFor', sortOrder: 'asc', limit: 100 },
        })
        expect(mockApi.post).toHaveBeenCalledWith('/api/planned-collections/collection-1/add-ingredients', {
            items: [{ ingredientId: 'ingredient-1', destination: 'shopping', quantity: 2, unit: 'oz' }],
        })
        expect(mockApi.post).toHaveBeenCalledWith('/api/planned-collections/collection-1/cocktails/cocktail-2/complete', {})
        expect(mockApi.post).toHaveBeenCalledWith('/api/suggestions', {
            type: 'NEW_COCKTAIL',
            title: 'Add Boulevardier',
            content: 'Please add this classic.',
        })
    })

    it('handles derivation/smart collection/user endpoint wrappers', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { success: true } })
        await expect(derivationsApi.get()).resolves.toEqual({})

        smartCollectionsApi.list()
        smartCollectionsApi.get('summer-sips')
        userApi.getProfile()
        userApi.updateProfile({ name: 'New Name' })
        userApi.changePassword('old', 'new-pass', 'new-pass')
        userApi.deleteAccount('old')
        userApi.deleteAccount()
        userApi.registerDevice({ platform: 'android', fcmToken: 'fcm-1' })
        userApi.unregisterDevice('fcm-1')
        userApi.getStats()

        expect(mockApi.get).toHaveBeenCalledWith('/api/smart-collections')
        expect(mockApi.get).toHaveBeenCalledWith('/api/smart-collections/summer-sips')
        expect(mockApi.get).toHaveBeenCalledWith('/api/user/me/profile')
        expect(mockApi.patch).toHaveBeenCalledWith('/api/user/me', { name: 'New Name' })
        expect(mockApi.post).toHaveBeenCalledWith('/api/user/me/change-password', {
            currentPassword: 'old',
            newPassword: 'new-pass',
            confirmPassword: 'new-pass',
        })
        expect(mockApi.delete).toHaveBeenCalledWith('/api/user/me', { data: { password: 'old' } })
        expect(mockApi.delete).toHaveBeenCalledWith('/api/user/me', { data: {} })
        expect(mockApi.post).toHaveBeenCalledWith('/api/devices', { platform: 'android', fcmToken: 'fcm-1' })
    })

    it('keeps derivations fallback object when API returns missing data payload', async () => {
        mockApi.get.mockResolvedValueOnce({ data: { success: true, data: null } })
        await expect(derivationsApi.get()).resolves.toEqual({})
    })
})
