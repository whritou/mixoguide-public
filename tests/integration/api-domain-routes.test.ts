import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForbiddenError, ValidationError } from '@/utils/errors'
import {
    csrfHeaders,
    jsonBody,
    makeAdminSession,
    makeSession,
    nextRequest,
    routeContext,
} from '../factories/auth'

const {
    mockCheckRateLimit,
    mockCocktailService,
    mockDeviceRepository,
    mockFavoriteService,
    mockIngredientService,
    mockMailService,
    mockPlannedCollectionService,
    mockPrisma,
    mockRateLimit,
    mockRatingService,
    mockRecommendationService,
    mockRequireAdmin,
    mockRequireUser,
    mockSmartCollectionService,
    mockSuggestionService,
    mockUploadStream,
} = vi.hoisted(() => ({
    mockCheckRateLimit: vi.fn(),
    mockCocktailService: {
        getMakeable: vi.fn(),
    },
    mockDeviceRepository: {
        deleteByToken: vi.fn(),
        upsert: vi.fn(),
    },
    mockFavoriteService: {
        exists: vi.fn(),
        remove: vi.fn(),
    },
    mockIngredientService: {
        getAll: vi.fn(),
    },
    mockMailService: {
        sendCollectionInvite: vi.fn(),
    },
    mockPlannedCollectionService: {
        addRsvp: vi.fn(),
        assertOwnership: vi.fn(),
        generateShareToken: vi.fn(),
        getById: vi.fn(),
        getGroceryList: vi.fn(),
        getPublicView: vi.fn(),
        revokeShareToken: vi.fn(),
    },
    mockPrisma: {
        $queryRaw: vi.fn(),
    },
    mockRateLimit: vi.fn(),
    mockRatingService: {
        getAll: vi.fn(),
    },
    mockRecommendationService: {
        getRecommendations: vi.fn(),
    },
    mockRequireAdmin: vi.fn(),
    mockRequireUser: vi.fn(),
    mockSmartCollectionService: {
        getBySlug: vi.fn(),
        listAll: vi.fn(),
    },
    mockSuggestionService: {
        create: vi.fn(),
        delete: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
    },
    mockUploadStream: vi.fn(),
}))

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: mockRequireAdmin,
    requireUser: mockRequireUser,
}))

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: mockCheckRateLimit,
    getIp: vi.fn(() => '203.0.113.10'),
    rateLimit: mockRateLimit,
}))

vi.mock('@/repositories/device.repository', () => ({ deviceRepository: mockDeviceRepository }))
vi.mock('@/services/cocktail.service', () => ({ cocktailService: mockCocktailService }))
vi.mock('@/services/favorite.service', () => ({ favoriteService: mockFavoriteService }))
vi.mock('@/services/ingredient.service', () => ({ ingredientService: mockIngredientService }))
vi.mock('@/services/mail.service', () => ({ mailService: mockMailService }))
vi.mock('@/services/planned-collection.service', () => ({ plannedCollectionService: mockPlannedCollectionService }))
vi.mock('@/services/rating.service', () => ({ ratingService: mockRatingService }))
vi.mock('@/services/recommendation.service', () => ({ recommendationService: mockRecommendationService }))
vi.mock('@/services/smart-collection.service', () => ({ smartCollectionService: mockSmartCollectionService }))
vi.mock('@/services/suggestion.service', () => ({ suggestionService: mockSuggestionService }))
vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))

vi.mock('@/lib/env', () => ({
    env: {
        CLOUDINARY_CLOUD_NAME: 'cloud',
        CLOUDINARY_API_KEY: 'key',
        CLOUDINARY_API_SECRET: 'secret',
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
        NODE_ENV: 'test',
    },
}))

vi.mock('cloudinary', () => ({
    v2: {
        config: vi.fn(),
        uploader: {
            upload_stream: mockUploadStream,
        },
    },
}))

import { POST as registerDevice, DELETE as unregisterDevice } from '@/app/api/devices/route'
import { GET as healthCheck } from '@/app/api/health/route'
import { GET as listIngredients } from '@/app/api/ingredients/route'
import { GET as readInvite } from '@/app/api/invite/[token]/route'
import { POST as createInviteRsvp } from '@/app/api/invite/[token]/rsvp/route'
import { POST as sendCollectionInvite } from '@/app/api/planned-collections/[id]/invite/route'
import { GET as readCollectionGrocery } from '@/app/api/planned-collections/[id]/grocery/route'
import { POST as enableCollectionShare, DELETE as disableCollectionShare } from '@/app/api/planned-collections/[id]/share/route'
import { GET as listRatings } from '@/app/api/ratings/route'
import { GET as listSmartCollections } from '@/app/api/smart-collections/route'
import { GET as readSmartCollection } from '@/app/api/smart-collections/[slug]/route'
import { GET as listSuggestions, POST as createSuggestion } from '@/app/api/suggestions/route'
import { GET as readSuggestion, PUT as updateSuggestion, DELETE as deleteSuggestion } from '@/app/api/suggestions/[id]/route'
import { POST as uploadAvatar } from '@/app/api/upload/route'
import { GET as listMakeableCocktails } from '@/app/api/cocktails/makeable/route'
import { GET as listRecommendations } from '@/app/api/cocktails/recommendations/route'
import { GET as favoriteExists, DELETE as removeFavorite } from '@/app/api/user-favorites-cocktail/[cocktailId]/route'

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.clearAllMocks()

    mockRequireUser.mockResolvedValue(makeSession())
    mockRequireAdmin.mockResolvedValue(makeAdminSession())
    mockRateLimit.mockResolvedValue(undefined)
    mockCheckRateLimit.mockResolvedValue(undefined)

    mockPrisma.$queryRaw.mockResolvedValue([{}])

    mockDeviceRepository.upsert.mockResolvedValue({ id: 'device-1' })
    mockDeviceRepository.deleteByToken.mockResolvedValue({ count: 1 })
    mockSmartCollectionService.listAll.mockResolvedValue([{ slug: 'summer', title: 'Summer', cocktails: [] }])
    mockSmartCollectionService.getBySlug.mockResolvedValue({ slug: 'summer', title: 'Summer', cocktails: [] })
    mockSuggestionService.getAll.mockResolvedValue({ data: [{ id: 'sug-1' }], meta: { total: 1 } })
    mockSuggestionService.create.mockResolvedValue({ id: 'sug-1' })
    mockSuggestionService.getById.mockResolvedValue({ id: 'sug-1', status: 'PENDING' })
    mockSuggestionService.update.mockResolvedValue({ id: 'sug-1', status: 'ACCEPTED' })
    mockSuggestionService.delete.mockResolvedValue(undefined)
    mockPlannedCollectionService.getPublicView.mockResolvedValue({
        id: 'collection-1',
        title: 'Party',
        location: 'Home',
        guestNote: null,
        plannedFor: new Date('2026-05-30T18:00:00.000Z'),
        servings: 4,
        occasions: [],
        user: { name: 'Host' },
        cocktails: [],
        rsvps: [],
    })
    mockPlannedCollectionService.addRsvp.mockResolvedValue({ id: 'rsvp-1', status: 'going' })
    mockPlannedCollectionService.getById.mockResolvedValue({
        id: 'collection-1',
        userId: 'user-1',
        title: 'Party',
        shareEnabled: true,
        shareToken: 'share-token',
        plannedFor: new Date('2026-05-30T18:00:00.000Z'),
        location: 'Home',
    })
    mockPlannedCollectionService.generateShareToken.mockResolvedValue({
        shareEnabled: true,
        shareToken: 'share-token',
    })
    mockPlannedCollectionService.getGroceryList.mockResolvedValue([{ ingredientName: 'Gin', missing: 1 }])
    mockPlannedCollectionService.revokeShareToken.mockResolvedValue(undefined)
    mockPlannedCollectionService.assertOwnership.mockImplementation(() => undefined)
    mockMailService.sendCollectionInvite.mockResolvedValue(undefined)
    mockCocktailService.getMakeable.mockResolvedValue([{ id: 'cocktail-1' }])
    mockRecommendationService.getRecommendations.mockResolvedValue([{ id: 'cocktail-1' }])
    mockFavoriteService.exists.mockResolvedValue(true)
    mockFavoriteService.remove.mockResolvedValue(undefined)
    mockRatingService.getAll.mockResolvedValue({ data: [{ id: 'rating-1' }], meta: { total: 1 } })
    mockIngredientService.getAll.mockResolvedValue({ data: [{ id: 'ing-1' }], meta: { total: 1 } })

    mockUploadStream.mockImplementation((_options: unknown, callback: (err: Error | null, result?: { secure_url: string }) => void) => ({
        end: () => callback(null, { secure_url: 'https://cdn.example/avatar.png' }),
    }))
})

describe('health + device routes', () => {
    it('returns 200 when health db ping succeeds', async () => {
        const response = await healthCheck()
        const body = await jsonBody<{ db: string }>(response)

        expect(response.status).toBe(200)
        expect(body.db).toBe('ok')
    })

    it('returns 503 when health db ping fails', async () => {
        mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('db down'))

        const response = await healthCheck()

        expect(response.status).toBe(503)
    })

    it('registers a device for the authenticated user', async () => {
        const response = await registerDevice(
            nextRequest({
                method: 'POST',
                path: '/api/devices',
                headers: csrfHeaders(),
                body: {
                    platform: 'android',
                    fcmToken: 'token-1',
                    appVersion: '1.0.0',
                },
            }),
            routeContext(),
        )
        const body = await jsonBody<{ data: { id: string } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.id).toBe('device-1')
    })

    it('returns 400 when unregister device payload is missing fcmToken', async () => {
        const response = await unregisterDevice(
            nextRequest({
                method: 'DELETE',
                path: '/api/devices',
                headers: csrfHeaders(),
                body: {},
            }),
            routeContext(),
        )

        expect(response.status).toBe(400)
        expect(mockDeviceRepository.deleteByToken).not.toHaveBeenCalled()
    })
})

describe('smart collection + suggestion routes', () => {
    it('lists smart collections without requiring an authenticated session', async () => {
        mockRequireUser.mockResolvedValueOnce(null)

        const response = await listSmartCollections(nextRequest({ path: '/api/smart-collections' }), routeContext())
        const body = await jsonBody<{ data: Array<{ slug: string }> }>(response)

        expect(response.status).toBe(200)
        expect(body.data[0].slug).toBe('summer')
    })

    it('reads one smart collection by slug', async () => {
        const response = await readSmartCollection(
            nextRequest({ path: '/api/smart-collections/summer' }),
            routeContext({ slug: 'summer' }),
        )
        const body = await jsonBody<{ data: { slug: string } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.slug).toBe('summer')
    })

    it('returns 403 when listing suggestions as non-admin', async () => {
        mockRequireAdmin.mockResolvedValueOnce(null)

        const response = await listSuggestions(
            nextRequest({ path: '/api/suggestions' }),
            routeContext(),
        )

        expect(response.status).toBe(403)
    })

    it('creates a suggestion and applies user rate limit', async () => {
        const response = await createSuggestion(
            nextRequest({
                method: 'POST',
                path: '/api/suggestions',
                headers: csrfHeaders(),
                body: {
                    type: 'NEW_COCKTAIL',
                    title: 'Create a Clover Club',
                    content: 'Please add this cocktail with full ingredients and instructions.',
                    targetId: 'cmnmsikky0007fndwt4ny7hhv',
                },
            }),
            routeContext(),
        )

        expect(response.status).toBe(201)
        expect(mockCheckRateLimit).toHaveBeenCalledWith('suggestion', 'user-1')
    })

    it('supports suggestion read/update/delete flows', async () => {
        const readResponse = await readSuggestion(
            nextRequest({ path: '/api/suggestions/sug-1' }),
            routeContext({ id: 'sug-1' }),
        )
        const updateResponse = await updateSuggestion(
            nextRequest({
                method: 'PUT',
                path: '/api/suggestions/sug-1',
                headers: csrfHeaders(),
                body: { status: 'ACCEPTED' },
            }),
            routeContext({ id: 'sug-1' }),
        )
        const deleteResponse = await deleteSuggestion(
            nextRequest({
                method: 'DELETE',
                path: '/api/suggestions/sug-1',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'sug-1' }),
        )

        expect(readResponse.status).toBe(200)
        expect(updateResponse.status).toBe(200)
        expect(deleteResponse.status).toBe(200)
    })
})

describe('invite/share/upload and priority coverage routes', () => {
    it('returns public invite data and accepts RSVP', async () => {
        const inviteResponse = await readInvite(
            nextRequest({ path: '/api/invite/token-1' }),
            routeContext({ token: 'token-1' }),
        )
        const rsvpResponse = await createInviteRsvp(
            nextRequest({
                method: 'POST',
                path: '/api/invite/token-1/rsvp',
                body: {
                    name: 'Ada',
                    status: 'going',
                    guestCount: 2,
                    email: 'ada@example.com',
                },
            }),
            routeContext({ token: 'token-1' }),
        )

        expect(inviteResponse.status).toBe(200)
        expect(rsvpResponse.status).toBe(201)
    })

    it('enables and revokes planned collection share token and gets grocery list', async () => {
        const enableResponse = await enableCollectionShare(
            nextRequest({
                method: 'POST',
                path: '/api/planned-collections/collection-1/share',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'collection-1' }),
        )
        const groceryResponse = await readCollectionGrocery(
            nextRequest({ path: '/api/planned-collections/collection-1/grocery' }),
            routeContext({ id: 'collection-1' }),
        )
        const disableResponse = await disableCollectionShare(
            nextRequest({
                method: 'DELETE',
                path: '/api/planned-collections/collection-1/share',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'collection-1' }),
        )

        expect(enableResponse.status).toBe(200)
        expect(groceryResponse.status).toBe(200)
        expect(disableResponse.status).toBe(204)
    })

    it('rejects sending invite email when link was not generated', async () => {
        mockPlannedCollectionService.getById.mockResolvedValueOnce({
            id: 'collection-1',
            userId: 'user-1',
            title: 'Party',
            shareEnabled: false,
            shareToken: null,
            plannedFor: new Date('2026-05-30T18:00:00.000Z'),
            location: 'Home',
        })

        const response = await sendCollectionInvite(
            nextRequest({
                method: 'POST',
                path: '/api/planned-collections/collection-1/invite',
                headers: csrfHeaders(),
                body: { email: 'guest@example.com' },
            }),
            routeContext({ id: 'collection-1' }),
        )

        expect(response.status).toBe(422)
        expect(mockMailService.sendCollectionInvite).not.toHaveBeenCalled()
    })

    it('returns upload validation error when file is missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/upload', {
            method: 'POST',
            headers: csrfHeaders(),
            body: new FormData(),
        })
        const response = await uploadAvatar(request, routeContext())

        expect(response.status).toBe(400)
    })

    it('uploads avatar when file is valid', async () => {
        const form = new FormData()
        form.set('file', new File(['fake-image'], 'avatar.png', { type: 'image/png' }))

        const request = new NextRequest('http://localhost:3000/api/upload', {
            method: 'POST',
            headers: csrfHeaders(),
            body: form,
        })
        const response = await uploadAvatar(request, routeContext())
        const body = await jsonBody<{ data: { url: string } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.url).toBe('https://cdn.example/avatar.png')
    })

    it('covers makeable/recommendation/favorites/ratings/ingredients route groups', async () => {
        const makeableResponse = await listMakeableCocktails(
            nextRequest({ path: '/api/cocktails/makeable?maxMissing=2' }),
            routeContext(),
        )
        const recommendationResponse = await listRecommendations(
            nextRequest({ path: '/api/cocktails/recommendations' }),
            routeContext(),
        )
        const favoriteExistsResponse = await favoriteExists(
            nextRequest({ path: '/api/user-favorites-cocktail/cocktail-1' }),
            routeContext({ cocktailId: 'cocktail-1' }),
        )
        const favoriteDeleteResponse = await removeFavorite(
            nextRequest({
                method: 'DELETE',
                path: '/api/user-favorites-cocktail/cocktail-1',
                headers: csrfHeaders(),
            }),
            routeContext({ cocktailId: 'cocktail-1' }),
        )
        const ratingsResponse = await listRatings(nextRequest({ path: '/api/ratings?limit=5' }), routeContext())
        const ingredientsResponse = await listIngredients(nextRequest({ path: '/api/ingredients?types=Spirit' }), routeContext())

        expect(makeableResponse.status).toBe(200)
        expect(recommendationResponse.status).toBe(200)
        expect(favoriteExistsResponse.status).toBe(200)
        expect(favoriteDeleteResponse.status).toBe(204)
        expect(ratingsResponse.status).toBe(200)
        expect(ingredientsResponse.status).toBe(200)
    })

    it('maps ownership errors from share routes to 403', async () => {
        mockPlannedCollectionService.assertOwnership.mockImplementationOnce(() => {
            throw new ForbiddenError('Forbidden')
        })

        const response = await enableCollectionShare(
            nextRequest({
                method: 'POST',
                path: '/api/planned-collections/collection-1/share',
                headers: csrfHeaders(),
            }),
            routeContext({ id: 'collection-1' }),
        )

        expect(response.status).toBe(403)
    })

    it('validates invite payload schema', async () => {
        const response = await sendCollectionInvite(
            nextRequest({
                method: 'POST',
                path: '/api/planned-collections/collection-1/invite',
                headers: csrfHeaders(),
                body: { email: 'not-an-email' },
            }),
            routeContext({ id: 'collection-1' }),
        )

        expect(response.status).toBe(422)
    })
})
