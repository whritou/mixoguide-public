import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError } from '@/utils/errors'
import {
    csrfHeaders,
    jsonBody,
    makeAdminSession,
    makeSession,
    nextRequest,
    routeContext,
} from '../factories/auth'

const {
    mockAuthService,
    mockCocktailService,
    mockFavoriteService,
    mockIngredientService,
    mockMailService,
    mockPantryService,
    mockPlannedCocktailService,
    mockPlannedCollectionService,
    mockRateLimit,
    mockRatingService,
    mockRequireAdmin,
    mockRequireUser,
    mockUserService,
    mockAdminStatsService,
    mockCocktailMadeLogService,
} = vi.hoisted(() => ({
    mockAdminStatsService: {
        getDashboardStats: vi.fn(),
    },
    mockAuthService: {
        createEmailToken: vi.fn(),
    },
    mockCocktailService: {
        getAll: vi.fn(),
        getById: vi.fn(),
    },
    mockCocktailMadeLogService: {
        delete: vi.fn(),
    },
    mockFavoriteService: {
        add: vi.fn(),
        getByUser: vi.fn(),
    },
    mockIngredientService: {
        getById: vi.fn(),
        delete: vi.fn(),
    },
    mockMailService: {
        sendVerificationEmail: vi.fn(),
    },
    mockPantryService: {
        addItemsBulk: vi.fn(),
        assertOwnership: vi.fn(),
        delete: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
    },
    mockPlannedCocktailService: {
        assertOwnership: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
    },
    mockPlannedCollectionService: {
        assertOwnership: vi.fn(),
        getById: vi.fn(),
    },
    mockRateLimit: vi.fn(),
    mockRatingService: {
        upsert: vi.fn(),
        delete: vi.fn(),
        getStats: vi.fn(),
    },
    mockRequireAdmin: vi.fn(),
    mockRequireUser: vi.fn(),
    mockUserService: {
        getByEmail: vi.fn(),
        update: vi.fn(),
    },
}))

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: mockRequireAdmin,
    requireUser: mockRequireUser,
}))

vi.mock('@/lib/rateLimit', () => ({
    rateLimit: mockRateLimit,
    checkRateLimit: mockRateLimit,
}))

vi.mock('@/services/admin-stats.service', () => ({ adminStatsService: mockAdminStatsService }))
vi.mock('@/services/auth.service', () => ({ authService: mockAuthService }))
vi.mock('@/services/cocktail-made-log.service', () => ({ cocktailMadeLogService: mockCocktailMadeLogService }))
vi.mock('@/services/cocktail.service', () => ({ cocktailService: mockCocktailService }))
vi.mock('@/services/ingredient.service', () => ({ ingredientService: mockIngredientService }))
vi.mock('@/services/rating.service', () => ({ ratingService: mockRatingService }))
vi.mock('@/services/favorite.service', () => ({ favoriteService: mockFavoriteService }))
vi.mock('@/services/mail.service', () => ({ mailService: mockMailService }))
vi.mock('@/services/pantry.service', () => ({ pantryService: mockPantryService }))
vi.mock('@/services/planned-cocktail.service', () => ({ plannedCocktailService: mockPlannedCocktailService }))
vi.mock('@/services/planned-collection.service', () => ({ plannedCollectionService: mockPlannedCollectionService }))
vi.mock('@/services/user.service', () => ({ userService: mockUserService }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))

import { POST as resendVerification } from '@/app/api/auth/resend-verification/route'
import { POST as addCocktailIngredients } from '@/app/api/cocktails/[id]/add-ingredients/route'
import { POST as addPlannedCocktailIngredients } from '@/app/api/planned-cocktails/[id]/add-ingredients/route'
import { POST as addPlannedCollectionIngredients } from '@/app/api/planned-collections/[id]/add-ingredients/route'
import { GET as listCocktails } from '@/app/api/cocktails/route'
import { GET as adminStats } from '@/app/api/admin/stats/route'
import { DELETE as deleteMadeLog } from '@/app/api/cocktail-made-logs/[id]/route'
import { GET as listUserFavorites } from '@/app/api/user/[userId]/favorites/route'
import { GET as listUserPlannedCocktails } from '@/app/api/user/[userId]/planned-cocktails/route'
import { GET as listPantryItems } from '@/app/api/user-pantry-items/route'
import { GET as getPantryItem } from '@/app/api/user-pantry-items/[id]/route'
import { GET as getPlannedCocktail } from '@/app/api/planned-cocktails/[id]/route'
import { GET as getPlannedCollection } from '@/app/api/planned-collections/[id]/route'
import { POST as createFavorite } from '@/app/api/user-favorites-cocktail/route'
import { PATCH as patchMe } from '@/app/api/user/me/route'
import { PUT as updatePantryItem, DELETE as deletePantryItem } from '@/app/api/user-pantry-items/[id]/route'
import { POST as completePlannedCocktail } from '@/app/api/planned-cocktails/[id]/complete/route'
import { GET as getIngredient, DELETE as deleteIngredient } from '@/app/api/ingredients/[id]/route'
import { POST as upsertRating, DELETE as deleteRating } from '@/app/api/ratings/[cocktailId]/route'

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockRateLimit.mockResolvedValue(undefined)
    mockRequireUser.mockResolvedValue(makeSession())
    mockRequireAdmin.mockResolvedValue(makeAdminSession())

    mockAdminStatsService.getDashboardStats.mockResolvedValue({ users: 1, cocktails: 2 })
    mockAuthService.createEmailToken.mockResolvedValue('email-token')
    mockCocktailService.getAll.mockResolvedValue({ data: [{ id: 'cocktail-1', name: 'Negroni' }], meta: { total: 1 } })
    mockCocktailService.getById.mockResolvedValue({ id: 'cmnmsikky0007fndwt4ny7hhv' })
    mockCocktailMadeLogService.delete.mockResolvedValue(undefined)
    mockFavoriteService.add.mockResolvedValue({ id: 'favorite-1' })
    mockMailService.sendVerificationEmail.mockResolvedValue(undefined)
    mockPantryService.addItemsBulk.mockResolvedValue({ addedToShopping: 1, addedToPantry: 0 })
    mockPantryService.getAll.mockResolvedValue({ data: [], meta: {} })
    mockPantryService.getById.mockResolvedValue({ id: 'pantry-1', userId: 'user-1' })
    mockPantryService.update.mockResolvedValue({ id: 'pantry-1' })
    mockPlannedCocktailService.getAll.mockResolvedValue({ data: [], meta: {} })
    mockPlannedCocktailService.getById.mockResolvedValue({ id: 'planned-1', userId: 'user-1' })
    mockPlannedCollectionService.getById.mockResolvedValue({ id: 'collection-1', userId: 'user-1' })
    mockUserService.getByEmail.mockResolvedValue({ id: 'user-1', email: 'user@example.com', emailVerified: null })
    mockUserService.update.mockResolvedValue({ id: 'user-1', name: 'Ada', image: null })
    mockIngredientService.getById.mockResolvedValue({ id: 'ing-1', name: 'Gin', typeId: 'type-1' })
    mockIngredientService.delete.mockResolvedValue(undefined)
    mockRatingService.upsert.mockResolvedValue({ id: 'rating-1', rating: 4 })
    mockRatingService.delete.mockResolvedValue(undefined)
    mockRatingService.getStats.mockResolvedValue({ average: 4.2, count: 5 })

    const ownerGuard = (item: { userId: string }, userId: string, isAdmin: boolean) => {
        if (item.userId !== userId && !isAdmin) throw new ForbiddenError('Forbidden')
    }
    mockPantryService.assertOwnership.mockImplementation(ownerGuard)
    mockPlannedCocktailService.assertOwnership.mockImplementation(ownerGuard)
    mockPlannedCollectionService.assertOwnership.mockImplementation(ownerGuard)
})

describe('authenticated route wrapper behavior', () => {
    it('blocks cross-origin mutations before loading the session', async () => {
        const response = await patchMe(
            nextRequest({
                method: 'PATCH',
                path:   '/api/user/me',
                headers: csrfHeaders('https://evil.example'),
                body:   { name: 'Ada' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(403)
        expect(mockRequireUser).not.toHaveBeenCalled()
        expect(mockUserService.update).not.toHaveBeenCalled()
    })

    it('returns 401 when a user route has no session', async () => {
        mockRequireUser.mockResolvedValueOnce(null)

        const response = await patchMe(
            nextRequest({ method: 'PATCH', path: '/api/user/me', headers: csrfHeaders(), body: { name: 'Ada' } }),
            routeContext(),
        )

        expect(response.status).toBe(401)
        expect(mockUserService.update).not.toHaveBeenCalled()
    })

    it('updates the authenticated user with same-origin CSRF headers', async () => {
        const response = await patchMe(
            nextRequest({ method: 'PATCH', path: '/api/user/me', headers: csrfHeaders(), body: { name: 'Ada' } }),
            routeContext(),
        )
        const body = await jsonBody<{ data: { name: string } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.name).toBe('Ada')
        expect(mockUserService.update).toHaveBeenCalledWith('user-1', { name: 'Ada' })
    })
})

describe('admin-only routes', () => {
    it('returns 403 for non-admin admin stats access', async () => {
        mockRequireAdmin.mockResolvedValueOnce(null)

        const response = await adminStats(nextRequest({ path: '/api/admin/stats' }), routeContext())

        expect(response.status).toBe(403)
        expect(mockAdminStatsService.getDashboardStats).not.toHaveBeenCalled()
    })

    it('returns admin stats for admins', async () => {
        const response = await adminStats(nextRequest({ path: '/api/admin/stats' }), routeContext())
        const body = await jsonBody<{ data: { users: number } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.users).toBe(1)
    })
})

describe('rate-limited public auth routes', () => {
    it('returns 429 when resend verification exceeds its limiter', async () => {
        mockRateLimit.mockRejectedValueOnce(new TooManyRequestsError('Too many attempts'))

        const response = await resendVerification(
            nextRequest({
                method: 'POST',
                path:   '/api/auth/resend-verification',
                headers: csrfHeaders(),
                body:   { email: 'user@example.com', callbackUrl: '/verify-email' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(429)
        expect(mockRateLimit).toHaveBeenCalledWith('resend-verification', expect.any(Request))
        expect(mockMailService.sendVerificationEmail).not.toHaveBeenCalled()
    })
})

describe('rate-limited public read routes', () => {
    it('applies the public-read limiter without requiring a user session', async () => {
        const response = await listCocktails(
            nextRequest({
                path:    '/api/cocktails?limit=1',
                headers: { 'x-forwarded-for': '203.0.113.77' },
            }),
            routeContext(),
        )
        const body = await jsonBody<{ data: Array<{ name: string }> }>(response)

        expect(response.status).toBe(200)
        expect(body.data[0].name).toBe('Negroni')
        expect(mockRateLimit).toHaveBeenCalledWith('public-read', expect.any(Request))
        expect(mockRequireUser).not.toHaveBeenCalled()
    })

    it('returns 429 before querying cocktails when the public-read limiter is exhausted', async () => {
        mockRateLimit.mockRejectedValueOnce(new TooManyRequestsError('Too many reads'))

        const response = await listCocktails(
            nextRequest({ path: '/api/cocktails' }),
            routeContext(),
        )

        expect(response.status).toBe(429)
        expect(mockCocktailService.getAll).not.toHaveBeenCalled()
    })
})

describe('owner-scoped route IDOR checks', () => {
    it.each([
        ['pantry item', getPantryItem, mockPantryService.getById],
        ['planned cocktail', getPlannedCocktail, mockPlannedCocktailService.getById],
        ['planned collection', getPlannedCollection, mockPlannedCollectionService.getById],
    ] as const)('returns 403 for another user\'s %s', async (_label, handler, getById) => {
        getById.mockResolvedValueOnce({ id: 'resource-1', userId: 'other-user' })

        const response = await handler(
            nextRequest({ path: '/api/resource/resource-1' }),
            routeContext({ id: 'resource-1' }),
        )

        expect(response.status).toBe(403)
    })

    it('returns 404 when the pantry item is missing', async () => {
        mockPantryService.getById.mockRejectedValueOnce(new NotFoundError('Pantry item not found'))

        const response = await getPantryItem(
            nextRequest({ path: '/api/user-pantry-items/missing' }),
            routeContext({ id: 'missing' }),
        )

        expect(response.status).toBe(404)
    })

    it('rejects listing another user pantry via query param', async () => {
        const response = await listPantryItems(
            nextRequest({ path: '/api/user-pantry-items?userId=other-user' }),
            routeContext(),
        )

        expect(response.status).toBe(403)
        expect(mockPantryService.getAll).not.toHaveBeenCalled()
    })

    it('rejects listing another user favorites via path param', async () => {
        const response = await listUserFavorites(
            nextRequest({ path: '/api/user/other-user/favorites' }),
            routeContext({ userId: 'other-user' }),
        )

        expect(response.status).toBe(403)
        expect(mockFavoriteService.getByUser).not.toHaveBeenCalled()
    })

    it('rejects listing another user planned cocktails via path param', async () => {
        const response = await listUserPlannedCocktails(
            nextRequest({ path: '/api/user/other-user/planned-cocktails' }),
            routeContext({ userId: 'other-user' }),
        )

        expect(response.status).toBe(403)
        expect(mockPlannedCocktailService.getAll).not.toHaveBeenCalled()
    })

    it('maps made-log service ownership denial to 403', async () => {
        mockCocktailMadeLogService.delete.mockRejectedValueOnce(new ForbiddenError('Forbidden'))

        const response = await deleteMadeLog(
            nextRequest({ method: 'DELETE', path: '/api/cocktail-made-logs/log-1', headers: csrfHeaders() }),
            routeContext({ id: 'log-1' }),
        )

        expect(response.status).toBe(403)
        expect(mockCocktailMadeLogService.delete).toHaveBeenCalledWith('log-1', 'user-1', false)
    })
})

describe('validation and conflict routes', () => {
    it('returns 422 for malformed bulk add payloads', async () => {
        const response = await addCocktailIngredients(
            nextRequest({
                method: 'POST',
                path:   '/api/cocktails/cmnmsikky0007fndwt4ny7hhv/add-ingredients',
                headers: csrfHeaders(),
                body:   { items: [{ ingredientId: 'not-a-cuid', quantity: -1, unit: 'bucket' }] },
            }),
            routeContext({ id: 'cmnmsikky0007fndwt4ny7hhv' }),
        )

        expect(response.status).toBe(422)
        expect(mockPantryService.addItemsBulk).not.toHaveBeenCalled()
    })

    it('returns 200 for valid bulk add payloads', async () => {
        const response = await addCocktailIngredients(
            nextRequest({
                method: 'POST',
                path:   '/api/cocktails/cmnmsikky0007fndwt4ny7hhv/add-ingredients',
                headers: csrfHeaders(),
                body:   {
                    items: [{
                        ingredientId: 'cmnmsikky0007fndwt4ny7hhv',
                        destination:  'shopping',
                        quantity:     2,
                        unit:         'pcs',
                    }],
                },
            }),
            routeContext({ id: 'cmnmsikky0007fndwt4ny7hhv' }),
        )

        expect(response.status).toBe(200)
        expect(mockPantryService.addItemsBulk).toHaveBeenCalledWith('user-1', [expect.objectContaining({ destination: 'shopping' })])
    })

    it.each([
        ['planned cocktail', addPlannedCocktailIngredients, 'planned-1'],
        ['planned collection', addPlannedCollectionIngredients, 'collection-1'],
    ] as const)('returns 422 when %s bulk add payload has more than 100 items', async (_label, handler, id) => {
        const response = await handler(
            nextRequest({
                method: 'POST',
                path:   `/api/resource/${id}/add-ingredients`,
                headers: csrfHeaders(),
                body:   {
                    items: Array.from({ length: 101 }, () => ({
                        ingredientId: 'cmnmsikky0007fndwt4ny7hhv',
                        destination:  'pantry',
                        quantity:     1,
                        unit:         'ml',
                    })),
                },
            }),
            routeContext({ id }),
        )

        expect(response.status).toBe(422)
        expect(mockPantryService.addItemsBulk).not.toHaveBeenCalled()
    })

    it('returns 403 before adding ingredients to another user planned collection', async () => {
        mockPlannedCollectionService.getById.mockResolvedValueOnce({ id: 'collection-1', userId: 'other-user' })

        const response = await addPlannedCollectionIngredients(
            nextRequest({
                method: 'POST',
                path:   '/api/planned-collections/collection-1/add-ingredients',
                headers: csrfHeaders(),
                body:   {
                    items: [{
                        ingredientId: 'cmnmsikky0007fndwt4ny7hhv',
                        destination:  'shopping',
                        quantity:     2,
                        unit:         'pcs',
                    }],
                },
            }),
            routeContext({ id: 'collection-1' }),
        )

        expect(response.status).toBe(403)
        expect(mockPantryService.addItemsBulk).not.toHaveBeenCalled()
    })

    it('returns 409 for duplicate favorites', async () => {
        mockFavoriteService.add.mockRejectedValueOnce(new ConflictError('Already in favorites'))

        const response = await createFavorite(
            nextRequest({
                method: 'POST',
                path:   '/api/user-favorites-cocktail',
                headers: csrfHeaders(),
                body:   { cocktailId: 'cmnmsikky0007fndwt4ny7hhv' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(409)
    })
})

describe('pantry item mutation ownership', () => {
    it('returns 403 when updating another user pantry item', async () => {
        mockPantryService.getById.mockResolvedValueOnce({ id: 'pantry-1', userId: 'other-user' })

        const response = await updatePantryItem(
            nextRequest({
                method: 'PUT',
                path:   '/api/user-pantry-items/pantry-1',
                headers: csrfHeaders(),
                body:   { isInPantry: true, unitLeft: 'cl' },
            }),
            routeContext({ id: 'pantry-1' }),
        )

        expect(response.status).toBe(403)
        expect(mockPantryService.update).not.toHaveBeenCalled()
    })

    it('returns 401 when deleting a pantry item without a session', async () => {
        mockRequireUser.mockResolvedValueOnce(null)

        const response = await deletePantryItem(
            nextRequest({
                method: 'DELETE',
                path:   '/api/user-pantry-items/pantry-1',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'pantry-1' }),
        )

        expect(response.status).toBe(401)
        expect(mockPantryService.delete).not.toHaveBeenCalled()
    })

    it('returns 404 when deleting a non-existent pantry item', async () => {
        mockPantryService.getById.mockRejectedValueOnce(new NotFoundError('Not found'))

        const response = await deletePantryItem(
            nextRequest({
                method:  'DELETE',
                path:    '/api/user-pantry-items/missing',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'missing' }),
        )

        expect(response.status).toBe(404)
    })
})

describe('planned cocktail complete route', () => {
    it('returns 403 when completing another user planned cocktail', async () => {
        mockPlannedCocktailService.getById.mockResolvedValueOnce({ id: 'planned-1', userId: 'other-user' })

        const response = await completePlannedCocktail(
            nextRequest({
                method: 'POST',
                path:   '/api/planned-cocktails/planned-1/complete',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'planned-1' }),
        )

        expect(response.status).toBe(403)
    })

    it('returns 401 when completing without a session', async () => {
        mockRequireUser.mockResolvedValueOnce(null)

        const response = await completePlannedCocktail(
            nextRequest({
                method: 'POST',
                path:   '/api/planned-cocktails/planned-1/complete',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'planned-1' }),
        )

        expect(response.status).toBe(401)
    })
})

describe('ingredient routes', () => {
    it('fetches an ingredient publicly without a session', async () => {
        const response = await getIngredient(
            nextRequest({ path: '/api/ingredients/ing-1' }),
            routeContext({ id: 'ing-1' }),
        )
        const body = await jsonBody<{ data: { name: string } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.name).toBe('Gin')
    })

    it('returns 404 for a missing ingredient', async () => {
        mockIngredientService.getById.mockRejectedValueOnce(new NotFoundError('Not found'))

        const response = await getIngredient(
            nextRequest({ path: '/api/ingredients/missing' }),
            routeContext({ id: 'missing' }),
        )

        expect(response.status).toBe(404)
    })

    it('returns 403 when a non-admin deletes an ingredient', async () => {
        mockRequireAdmin.mockResolvedValueOnce(null)

        const response = await deleteIngredient(
            nextRequest({
                method:  'DELETE',
                path:    '/api/ingredients/ing-1',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'ing-1' }),
        )

        expect(response.status).toBe(403)
        expect(mockIngredientService.delete).not.toHaveBeenCalled()
    })
})

describe('rating routes', () => {
    it('returns 401 when submitting a rating without a session', async () => {
        mockRequireUser.mockResolvedValueOnce(null)

        const response = await upsertRating(
            nextRequest({
                method:  'POST',
                path:    '/api/ratings/cmnmsikky0007fndwt4ny7hhv',
                headers: csrfHeaders(),
                body:    { rating: 4 },
            }),
            routeContext({ cocktailId: 'cmnmsikky0007fndwt4ny7hhv' }),
        )

        expect(response.status).toBe(401)
        expect(mockRatingService.upsert).not.toHaveBeenCalled()
    })

    it('returns 422 when rating is out of range', async () => {
        const response = await upsertRating(
            nextRequest({
                method:  'POST',
                path:    '/api/ratings/cmnmsikky0007fndwt4ny7hhv',
                headers: csrfHeaders(),
                body:    { rating: 6 },
            }),
            routeContext({ cocktailId: 'cmnmsikky0007fndwt4ny7hhv' }),
        )

        expect(response.status).toBe(422)
        expect(mockRatingService.upsert).not.toHaveBeenCalled()
    })

    it('returns 401 when deleting a rating without a session', async () => {
        mockRequireUser.mockResolvedValueOnce(null)

        const response = await deleteRating(
            nextRequest({
                method:  'DELETE',
                path:    '/api/ratings/cmnmsikky0007fndwt4ny7hhv',
                headers: csrfHeaders(),
            }),
            routeContext({ cocktailId: 'cmnmsikky0007fndwt4ny7hhv' }),
        )

        expect(response.status).toBe(401)
        expect(mockRatingService.delete).not.toHaveBeenCalled()
    })

    it('blocks cross-origin rating mutations', async () => {
        const response = await upsertRating(
            nextRequest({
                method:  'POST',
                path:    '/api/ratings/cmnmsikky0007fndwt4ny7hhv',
                headers: csrfHeaders('https://evil.example'),
                body:    { rating: 3 },
            }),
            routeContext({ cocktailId: 'cmnmsikky0007fndwt4ny7hhv' }),
        )

        expect(response.status).toBe(403)
        expect(mockRatingService.upsert).not.toHaveBeenCalled()
    })
})
