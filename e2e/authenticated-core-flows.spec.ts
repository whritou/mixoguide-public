import { expect, test, type Page, type Route } from '@playwright/test'
import { setFixtureSession } from './helpers/session'

test.use({ viewport: { width: 1280, height: 800 } })
test.describe.configure({ mode: 'serial' })

const FIXTURE_NOW = '2026-05-26T10:00:00.000Z'
const FIXTURE_USER = {
    id: 'e2e-user-1',
    email: 'fixture.user@mixoguide.test',
    name: 'Fixture User',
    role: 'USER' as const,
}
const FIXTURE_ADMIN = {
    id: 'e2e-admin-1',
    email: 'fixture.admin@mixoguide.test',
    name: 'Fixture Admin',
    role: 'ADMIN' as const,
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
    await route.fulfill({
        status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

function buildPantryItem() {
    return {
        id: 'pantry-1',
        userId: FIXTURE_USER.id,
        ingredientId: 'ingredient-gin',
        quantity: 1,
        unitLeft: 'oz',
        favorite: false,
        expirationDate: null,
        isEssential: false,
        isInfinite: false,
        isInPantry: true,
        isInShoppingList: false,
        shoppingQuantity: 0,
        addedAt: FIXTURE_NOW,
        note: null,
        updatedAt: null,
        ingredient: {
            id: 'ingredient-gin',
            name: 'Gin',
            imageUrl: null,
            isAlcoholic: true,
            type: { id: 'type-spirit', name: 'Spirit' },
            subType: { id: 'subtype-london-dry', name: 'London Dry Gin' },
        },
    }
}

function buildIngredient(id: string, name: string) {
    return {
        id,
        name,
        description: null,
        typeId: 'type-spirit',
        subTypeId: 'subtype-london-dry',
        type: { id: 'type-spirit', name: 'Spirit' },
        subType: { id: 'subtype-london-dry', name: 'London Dry Gin', typeId: 'type-spirit' },
        isAlcoholic: true,
        abv: 40,
        brand: null,
        imageUrl: null,
        unit: 'oz',
        _count: { cocktailIngredients: 12 },
    }
}

function buildCollection() {
    return {
        id: 'collection-1',
        userId: FIXTURE_USER.id,
        title: 'Sunset Party',
        location: 'Roof deck',
        guestNote: 'Bring citrus',
        plannedFor: '2026-06-01T18:30:00.000Z',
        servings: 6,
        occasions: ['party'],
        status: 'planned',
        completedAt: null,
        createdAt: FIXTURE_NOW,
        updatedAt: FIXTURE_NOW,
        shareToken: null,
        shareEnabled: false,
        rsvpGoingCount: 0,
        cocktails: [
            {
                id: 'collection-cocktail-1',
                cocktailId: 'cocktail-negroni',
                cocktail: {
                    id: 'cocktail-negroni',
                    name: 'Negroni',
                    imageUrl: '/placeholder.svg',
                    difficulty: 'easy',
                    ingredients: [
                        {
                            ingredientId: 'ingredient-gin',
                            amount: 1,
                            unit: 'oz',
                            optional: false,
                            ingredient: {
                                id: 'ingredient-gin',
                                name: 'Gin',
                                isAlcoholic: true,
                                type: { name: 'Spirit' },
                                subType: { name: 'London Dry Gin' },
                            },
                        },
                    ],
                },
            },
        ],
    }
}

function buildAdminStats() {
    return {
        counts: {
            cocktails: 250,
            ingredients: 480,
            users: 42,
            ratings: 300,
            plannedCocktails: 18,
            completedCocktails: 120,
            glasses: 16,
            barTools: 22,
        },
        alcoholDistribution: { alcoholic: 220, nonAlcoholic: 30 },
        difficultyDistribution: [{ difficulty: 'easy', count: 160 }],
        techniqueDistribution: [{ technique: 'stirred', count: 90 }],
        topIngredients: [{ name: 'Lime Juice', count: 120 }],
        ratingsDistribution: [{ rating: 5, count: 110 }],
        bestRated: [{ name: 'Negroni', avgRating: 4.9, ratingCount: 30 }],
        recentCompletions: [],
    }
}

async function mockPantryApis(page: Page) {
    await page.route('**/api/ingredients**', async (route) => {
        if (route.request().method() !== 'GET') {
            await fulfillJson(route, { data: {} }, 405)
            return
        }

        await fulfillJson(route, {
            success: true,
            data: [
                buildIngredient('ingredient-gin', 'Gin'),
                buildIngredient('ingredient-campari', 'Campari'),
            ],
            meta: { total: 2, page: 1, limit: 500, totalPages: 1 },
        })
    })

    await page.route('**/api/user-pantry-items**', async (route) => {
        const request = route.request()
        const { pathname } = new URL(request.url())

        if (request.method() === 'GET' && pathname.endsWith('/stats')) {
            await fulfillJson(route, {
                success: true,
                data: {
                    total: 1,
                    low: 0,
                    out: 0,
                    toBuy: 0,
                    categories: [{ name: 'Spirit', count: 1 }],
                },
            })
            return
        }

        if (request.method() === 'GET') {
            await fulfillJson(route, {
                success: true,
                data: [buildPantryItem()],
                meta: { total: 1, page: 1, limit: 500, totalPages: 1 },
            })
            return
        }

        if (request.method() === 'POST') {
            const payload = request.postDataJSON() as Record<string, unknown>
            await fulfillJson(route, {
                success: true,
                data: {
                    ...buildPantryItem(),
                    id: 'pantry-created-1',
                    ingredientId: String(payload.ingredientId ?? 'ingredient-gin'),
                    quantity: Number(payload.quantity ?? 1),
                },
            })
            return
        }

        await fulfillJson(route, { success: true, data: {} })
    })
}

async function mockPlannerApis(page: Page) {
    const collection = buildCollection()

    await page.route('**/api/cocktails**', async (route) => {
        if (route.request().method() !== 'GET') {
            await fulfillJson(route, { data: {} }, 405)
            return
        }
        await fulfillJson(route, {
            success: true,
            data: [
                { id: 'cocktail-negroni', name: 'Negroni', imageUrl: null, difficulty: 'easy' },
                { id: 'cocktail-daiquiri', name: 'Daiquiri', imageUrl: null, difficulty: 'easy' },
            ],
            meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
        })
    })

    await page.route('**/api/cocktail-made-logs**', async (route) => {
        await fulfillJson(route, { success: true, data: [], meta: { total: 0, page: 1, limit: 20 } })
    })

    await page.route('**/api/planned-cocktails**', async (route) => {
        await fulfillJson(route, { success: true, data: [], meta: { total: 0, page: 1, limit: 20 } })
    })

    await page.route('**/api/rsvps/mine', async (route) => {
        await fulfillJson(route, { success: true, data: [] })
    })

    await page.route('**/api/invite/**', async (route) => {
        await fulfillJson(route, { success: true, data: { rsvps: [] } })
    })

    await page.route('**/api/planned-collections**', async (route) => {
        const request = route.request()
        const { pathname } = new URL(request.url())

        if (request.method() === 'GET' && pathname.endsWith('/grocery')) {
            await fulfillJson(route, {
                success: true,
                data: [
                    {
                        ingredientId: 'ingredient-gin',
                        ingredientName: 'Gin',
                        totalNeeded: 3,
                        unit: 'oz',
                        inPantry: 1,
                        missing: 2,
                        inWishlist: false,
                    },
                ],
                meta: { total: 1, page: 1, limit: 50 },
            })
            return
        }

        if (request.method() === 'POST' && pathname.endsWith('/share')) {
            await fulfillJson(route, {
                success: true,
                data: { shareToken: 'fixture-share-token', shareEnabled: true },
            })
            return
        }

        if (request.method() === 'POST' && pathname.endsWith('/complete')) {
            await fulfillJson(route, {
                success: true,
                data: { ...collection, status: 'done', completedAt: FIXTURE_NOW },
            })
            return
        }

        if (request.method() === 'POST' && pathname === '/api/planned-collections') {
            await fulfillJson(route, {
                success: true,
                data: {
                    ...collection,
                    id: 'collection-created-1',
                    title: 'Launch Night',
                },
            }, 201)
            return
        }

        if (request.method() === 'GET' && pathname === '/api/planned-collections') {
            await fulfillJson(route, {
                success: true,
                data: [collection],
                meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
            })
            return
        }

        await fulfillJson(route, { success: true, data: {} })
    })
}

async function mockUserApis(page: Page) {
    await page.route('**/api/user/me/profile', async (route) => {
        await fulfillJson(route, {
            success: true,
            data: {
                id: FIXTURE_USER.id,
                name: FIXTURE_USER.name,
                email: FIXTURE_USER.email,
                image: null,
                hasPassword: true,
                linkedProviders: ['credentials'],
                role: 'USER',
                stats: {
                    ratings: 3,
                    favoriteCocktails: 2,
                    madeLogs: 4,
                    pantryItems: 8,
                    plannedCocktails: 2,
                },
            },
        })
    })

    await page.route('**/api/user/me/change-password', async (route) => {
        if (route.request().method() === 'POST') {
            await fulfillJson(route, { success: true, data: { updated: true } })
            return
        }
        await fulfillJson(route, { success: true, data: {} })
    })

    await page.route('**/api/user/me', async (route) => {
        if (route.request().method() === 'PATCH') {
            const payload = route.request().postDataJSON() as Record<string, unknown>
            await fulfillJson(route, {
                success: true,
                data: { name: payload.name ?? FIXTURE_USER.name, image: null },
            })
            return
        }
        await fulfillJson(route, { success: true, data: {} })
    })
}

async function mockAdminApis(page: Page, options?: { ingredientListFails?: boolean }) {
    await page.route('**/api/admin/stats', async (route) => {
        await fulfillJson(route, { success: true, data: buildAdminStats() })
    })

    await page.route('**/api/ingredients**', async (route) => {
        if (options?.ingredientListFails) {
            await fulfillJson(route, { success: false, message: 'boom' }, 500)
            return
        }

        await fulfillJson(route, {
            success: true,
            data: [buildIngredient('ingredient-gin', 'Gin')],
            meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        })
    })

    await page.route('**/api/ingredient-types**', async (route) => {
        await fulfillJson(route, {
            success: true,
            data: [{ id: 'type-spirit', name: 'Spirit' }],
            meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
        })
    })

    await page.route('**/api/ingredient-subtypes**', async (route) => {
        await fulfillJson(route, {
            success: true,
            data: [{ id: 'subtype-london-dry', name: 'London Dry Gin', typeId: 'type-spirit' }],
            meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
        })
    })
}

test('redirects unauthenticated users from protected surfaces', async ({ context, page }) => {
    await context.clearCookies()

    for (const path of ['/pantry', '/planner', '/user', '/admin']) {
        await page.goto(path)
        await expect(page).toHaveURL(/\/signin\?callbackUrl=/)
    }
})

test.describe('Authenticated Core Flows', () => {
    test.beforeEach(async ({ context }) => {
        test.skip(!process.env.NEXTAUTH_SECRET, 'Set NEXTAUTH_SECRET to run authenticated Playwright fixtures.')
        await context.clearCookies()
    })

    test('pantry add flow submits a new pantry item', async ({ context, page }) => {
        await setFixtureSession(context, FIXTURE_USER)
        await mockPantryApis(page)

        await page.goto('/pantry')
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('heading', { name: /My Pantry/i })).toBeVisible()
        await page.getByRole('button', { name: 'Add ingredient' }).first().click()

        const dialog = page.getByRole('dialog')
        await expect(dialog.getByText('Add to pantry')).toBeVisible()
        await dialog.getByRole('combobox').click()
        await dialog.getByRole('button', { name: /^Gin/i }).click()
        await dialog.locator('input[type="number"]').fill('2')

        const addRequestPromise = page.waitForRequest(
            (request) => request.method() === 'POST' && request.url().includes('/api/user-pantry-items'),
        )
        await dialog.getByRole('button', { name: 'Add to pantry' }).click()
        const addRequest = await addRequestPromise

        expect(addRequest.postDataJSON()).toMatchObject({
            ingredientId: 'ingredient-gin',
            quantity: 2,
        })
    })

    test('planner supports create, invite share, and complete actions', async ({ context, page }) => {
        await setFixtureSession(context, FIXTURE_USER)
        await mockPlannerApis(page)

        await page.goto('/planner?view=collections')
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('heading', { name: 'All events', level: 1 })).toBeVisible()

        await page.getByRole('button', { name: 'New event' }).click()
        const createDialog = page.getByRole('dialog')
        await expect(createDialog.getByText('New Event')).toBeVisible()

        await createDialog.getByPlaceholder("e.g. Tom's Birthday").fill('Launch Night')
        await createDialog.locator('input[type="date"]').first().fill('2026-06-10')

        const createRequestPromise = page.waitForRequest(
            (request) => request.method() === 'POST' && request.url().endsWith('/api/planned-collections'),
        )
        await createDialog.getByRole('button', { name: 'Create event' }).click()
        await createRequestPromise

        await page.getByRole('button', { name: 'Invite guests' }).first().click()
        await expect(page.getByText('Invite guests')).toBeVisible()

        const shareRequestPromise = page.waitForRequest(
            (request) => request.method() === 'POST' && request.url().includes('/api/planned-collections/collection-1/share'),
        )
        await page.getByRole('button', { name: 'Generate invite link' }).click()
        await shareRequestPromise

        await expect(page.locator('input[value*="/invite/fixture-share-token"]')).toBeVisible()

        const completeRequestPromise = page.waitForRequest(
            (request) => request.method() === 'POST' && request.url().includes('/api/planned-collections/collection-1/complete'),
        )
        await page.getByRole('button', { name: 'Mark done' }).first().click()
        await page.getByRole('button', { name: 'Mark done' }).last().click()
        await completeRequestPromise
    })

    test('profile update and password validation paths are covered', async ({ context, page }) => {
        await setFixtureSession(context, FIXTURE_USER)
        await mockUserApis(page)

        await page.goto('/user')
        await page.waitForLoadState('networkidle')

        await expect(page.getByText('Edit Profile')).toBeVisible()
        await expect(page.getByText('Change Password')).toBeVisible()

        const editableTextInputs = page.locator('input[type="text"], input:not([type])')
        await editableTextInputs.first().fill('Updated Fixture User')

        const patchRequestPromise = page.waitForRequest(
            (request) => request.method() === 'PATCH' && request.url().includes('/api/user/me'),
        )
        await page.getByRole('button', { name: 'Save changes' }).click()
        const patchRequest = await patchRequestPromise
        expect(patchRequest.postDataJSON()).toMatchObject({ name: 'Updated Fixture User' })

        const passwordInputs = page.locator('input[type="password"]')
        await passwordInputs.nth(0).fill('current-password')
        await passwordInputs.nth(1).fill('new-password-123')
        await passwordInputs.nth(2).fill('different-password-456')
        await page.getByRole('button', { name: 'Update password' }).click()
        await expect(page.getByText('New passwords do not match.')).toBeVisible()
    })

    test('admin happy path and error path are exercised', async ({ context, page }) => {
        await setFixtureSession(context, FIXTURE_USER)
        await page.goto('/admin')
        await expect(page).toHaveURL('/unauthorized')

        await context.clearCookies()
        await setFixtureSession(context, FIXTURE_ADMIN)
        await mockAdminApis(page)

        await page.goto('/admin')
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

        await page.goto('/admin/ingredients')
        await page.waitForLoadState('networkidle')
        await expect(page.getByText('Ingredients')).toBeVisible()
        await expect(page.getByText('Gin')).toBeVisible()
        await page.getByRole('link', { name: 'New Ingredient' }).click()
        await expect(page).toHaveURL('/admin/ingredients/create')
        await expect(page.getByText('Create a new ingredient')).toBeVisible()

        await context.clearCookies()
        await setFixtureSession(context, FIXTURE_ADMIN)
        await mockAdminApis(page, { ingredientListFails: true })

        await page.goto('/admin/ingredients')
        await expect(page.getByText('Error loading ingredients.')).toBeVisible()
    })
})
