import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page, Route } from '@playwright/test'
import { DEMO_BOTTLES } from '../../src/lib/demo-bar/demo-bottles'

const fx = JSON.parse(readFileSync(path.join(__dirname, 'fixtures', 'public.json'), 'utf8'))

const PLACEHOLDER_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#d8cfc4"/></svg>'

const NOW = '2026-05-26T10:00:00.000Z'

const meta = (total: number, limit = 20) => ({
    total,
    page: 1,
    limit,
    totalPages: total ? 1 : 0,
    hasNextPage: false,
    hasPreviousPage: false,
})

function json(route: Route, body: unknown, status = 200) {
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

const list = (data: unknown[], limit = 20) => ({ success: true, data, meta: meta(data.length, limit) })

function pantryItems() {
    return fx.ingredients.data.slice(0, 5).map((ingredient: { id: string; name: string }, i: number) => ({
        id: `pantry-${i}`,
        userId: 'e2e-user-1',
        ingredientId: ingredient.id,
        quantity: 1 + i,
        unitLeft: 'oz',
        favorite: i === 0,
        expirationDate: null,
        isEssential: false,
        isInfinite: false,
        isInPantry: true,
        isInShoppingList: false,
        shoppingQuantity: 0,
        addedAt: NOW,
        note: null,
        updatedAt: null,
        ingredient: {
            id: ingredient.id,
            name: ingredient.name,
            imageUrl: null,
            isAlcoholic: true,
            type: { id: 'type-spirit', name: 'Spirit' },
            subType: { id: 'subtype-fixture', name: 'Fixture' },
        },
    }))
}

function collection() {
    return {
        id: 'collection-1',
        userId: 'e2e-user-1',
        title: 'Sunset Party',
        location: 'Roof deck',
        guestNote: 'Bring citrus',
        plannedFor: '2026-06-01T18:30:00.000Z',
        servings: 6,
        occasions: ['party'],
        status: 'planned',
        completedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
        shareToken: null,
        shareEnabled: false,
        rsvpGoingCount: 0,
        cocktails: fx.cocktails.data.slice(0, 2).map((c: { id: string; name: string }, i: number) => ({
            id: `collection-cocktail-${i}`,
            cocktailId: c.id,
            cocktail: { id: c.id, name: c.name, imageUrl: '/placeholder.svg', difficulty: 'easy', ingredients: [] },
        })),
    }
}

function userStats() {
    const weekly = [0, 1, 0, 2, 3, 1, 4, 2, 5, 3, 6, 4]
    const monthly = [2, 3, 1, 4, 6, 5, 0, 0, 0, 0, 0, 0]
    return {
        thisWeek: 4,
        thisMonth: 9,
        thisYear: 21,
        allTime: 48,
        currentStreak: 3,
        longestStreak: 7,
        topCocktails: fx.cocktails.data.slice(0, 4).map((c: { id: string; name: string }, i: number) => ({
            cocktailId: c.id,
            name: c.name,
            imageUrl: null,
            count: 9 - i * 2,
            archived: false,
        })),
        weeklyTrend: weekly.map((drinks, i) => ({ label: `W${String(i + 1).padStart(2, '0')}`, drinks })),
        monthlyTrend: monthly.map((drinks, i) => ({ label: `M${String(i + 1).padStart(2, '0')}`, drinks })),
    }
}

function demoBottles() {
    return DEMO_BOTTLES.map(({ key, label, shelf, image }) => ({ key, ingredientId: `demo-${key}`, label, shelf, image }))
}

function makeablePreview() {
    const [first, second, third, fourth, fifth] = fx.cocktails.data
    const top = [first, second, third].map((c: { id: string; name: string }) => ({ ...c, preparationTime: 4, makeableStatus: 'READY', missingCount: 0 }))
    return {
        makeableCount: 14,
        top,
        oneBottleAway: {
            ingredient: { id: 'demo-sweetv', name: 'Sweet Vermouth' },
            unlocks: [fourth, fifth].map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
        },
    }
}

function smartCollections() {
    return [
        {
            slug: 'cozy-winter',
            title: 'Cozy Winter',
            subtitle: 'Warm, spiced drinks for chilly nights.',
            icon: 'snowflake',
            accent: 'brown',
            defaultServings: 4,
            defaultDayOffset: 0,
            occasions: ['winter'],
            cocktailCount: 6,
            cocktails: fx.cocktails.data.slice(4, 10).map((c: { id: string; name: string; difficulty: string }) => ({
                id: c.id,
                name: c.name,
                imageUrl: null,
                isAlcoholic: true,
                difficulty: c.difficulty,
                avgRating: null,
                ratingCount: 0,
            })),
        },
    ]
}

export async function installMocks(page: Page, opts: { authed: boolean }) {
    const unmocked: string[] = []

    await page.route(
        (url) => url.hostname !== 'localhost',
        (route) =>
            route.request().resourceType() === 'image'
                ? route.fulfill({ status: 200, contentType: 'image/svg+xml', body: PLACEHOLDER_SVG })
                : route.abort(),
    )

    await page.route('**/_next/image**', (route) =>
        route.fulfill({ status: 200, contentType: 'image/svg+xml', body: PLACEHOLDER_SVG }),
    )

    await page.route('**/api/**', async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        const p = url.pathname

        if (p.startsWith('/api/auth/')) return route.continue()

        if (request.method() === 'POST' && p === '/api/cocktails/makeable-preview') {
            return json(route, { success: true, data: makeablePreview() })
        }

        const key = `${request.method()} ${p}${url.search}`
        if (request.method() !== 'GET') {
            unmocked.push(key)
            return json(route, { success: false }, 405)
        }

        const requiresLogin = () =>
            json(route, { success: false, error: { message: 'Login required', code: 'UNAUTHORIZED' } }, 401)

        switch (p) {
            case '/api/cocktails':
                return json(route, fx.cocktails)
            case '/api/cocktails/recommendations':
            case '/api/user-favorites-cocktail':
                return opts.authed ? json(route, { success: true, data: [] }) : requiresLogin()
            case '/api/cocktails/makeable-preview':
                return json(route, { success: true, data: demoBottles() })
            case '/api/smart-collections':
                return json(route, { success: true, data: smartCollections() })
            case '/api/cocktails/best-rated-makeable':
            case '/api/cocktails/makeable':
                return json(route, { success: true, data: [] })
            case '/api/ingredients':
                return json(route, fx.ingredients)
            case '/api/ingredient-types':
                return json(route, fx.types)
            case '/api/ingredient-subtypes':
                return json(route, fx.subtypes)
            case '/api/ratings':
                return json(route, {
                    success: true,
                    data: [4, 5].map((rating, i) => ({
                        id: `rating-${i}`,
                        userId: `rater-${i}`,
                        cocktailId: fx.detailId,
                        rating,
                        createdAt: NOW,
                        user: { id: `rater-${i}`, name: `Fixture Rater ${i + 1}`, image: null, role: 'USER' },
                    })),
                    meta: meta(2),
                })
            case '/api/derivations':
                return json(route, { success: true, data: {} })
            case '/api/user/stats':
                return json(route, { success: true, data: userStats() })
            case '/api/user-pantry-items/stats':
                return json(route, {
                    success: true,
                    data: { total: 5, low: 1, out: 0, toBuy: 0, categories: [{ name: 'Spirit', count: 5 }] },
                })
            case '/api/user-pantry-items':
                return json(route, list(pantryItems(), 500))
            case '/api/planned-collections': {
                const upcoming = url.searchParams.get('status') === 'planned' && !url.search.includes('%5Blt%5D')
                return json(route, list(upcoming ? [collection()] : [], 200))
            }
            case '/api/planned-cocktails':
            case '/api/cocktail-made-logs':
                return json(route, list([], 200))
            case '/api/rsvps/mine':
                return json(route, { success: true, data: [] })
        }

        if (p === `/api/cocktails/${fx.detailId}`) return json(route, fx.detail)

        unmocked.push(key)
        return json(route, { success: false }, 404)
    })

    return unmocked
}
