import { test, expect, type APIRequestContext, type Page, type Response } from '@playwright/test'
import { config } from 'dotenv'
import { encodeBarParam } from '../src/lib/demo-bar/bar-param'
import { EXAMPLE_KEYS } from '../src/components/home/landing/shelf-state'
import { setVisualSession } from './visual/session'
import { installMocks } from './visual/mocks'
import { VISUAL_USER } from './visual/pages'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

test.use({ viewport: { width: 1280, height: 800 } })
test.setTimeout(60_000)

async function exampleParam(request: APIRequestContext): Promise<string> {
    const response = await request.get('/api/cocktails/makeable-preview')
    const { data } = (await response.json()) as { data: { key: string; ingredientId: string | null }[] }
    const ids = data.filter(b => EXAMPLE_KEYS.includes(b.key) && b.ingredientId).map(b => b.ingredientId as string)
    return encodeBarParam(ids)
}

test.describe('Shared bar card', () => {
    test('garbage param returns 200 with the empty state', async ({ page }) => {
        const response = await page.goto('/bar?i=garbage')
        expect(response?.status()).toBe(200)
        await expect(page.getByRole('heading', { name: 'Start your own bar' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Start your own bar' })).toHaveAttribute('href', '/#shelf')
    })

    test('an oversized param returns 200 with the empty state', async ({ page }) => {
        const response = await page.goto(`/bar?i=${'a'.repeat(5000)}`)
        expect(response?.status()).toBe(200)
        await expect(page.getByRole('heading', { name: 'Start your own bar' })).toBeVisible()
    })

    test('a real bar shows what it makes and links to the landing shelf', async ({ page, request }) => {
        const param = await exampleParam(request)
        const response = await page.goto(`/bar?i=${param}`)
        expect(response?.status()).toBe(200)
        await expect(page.getByRole('heading', { name: /This bar makes \d+ cocktails?/ })).toBeVisible()
        await expect(page.getByText(/^Signature: /)).toBeVisible()
        await expect(page.getByRole('link', { name: 'Try it with your own bar' })).toHaveAttribute(
            'href',
            `/?bar=${param}#shelf`,
        )
    })

    test('the page advertises an absolute preview image that renders', async ({ page, request }) => {
        const param = await exampleParam(request)
        await page.goto(`/bar?i=${param}`)
        const og = await page.locator('meta[property="og:image"]').getAttribute('content')
        expect(og).toMatch(/^https?:\/\/.+\/bar\/og\?i=/)
        const image = await request.get(`/bar/og?i=${param}`)
        expect(image.status()).toBe(200)
        expect(image.headers()['content-type']).toContain('image/png')
        const generic = await request.get('/bar/og?i=garbage')
        expect(generic.status()).toBe(200)
    })

    test('the landing page opens with the shared bar and does not write storage on load', async ({ page, request }) => {
        const param = await exampleParam(request)
        await page.goto(`/?bar=${param}`)
        await expect(page.getByText('This is a shared bar. Tap to make it yours.')).toBeVisible({ timeout: 30_000 })
        expect(await page.evaluate(() => localStorage.getItem('mg:demo-bar'))).toBeNull()
    })
})

type Bottle = { key: string; ingredientId: string | null; label: string }

async function loadBottles(request: APIRequestContext): Promise<Bottle[]> {
    const response = await request.get('/api/cocktails/makeable-preview')
    return ((await response.json()) as { data: Bottle[] }).data
}

function menuCount(page: Page) {
    return page.getByText('Tonight you can make').locator('xpath=following-sibling::span[1]')
}

async function readCount(page: Page): Promise<number> {
    await expect(menuCount(page)).toHaveText(/^\d+$/, { timeout: 30_000 })
    return Number(await menuCount(page).textContent())
}

function storedIds(page: Page): Promise<string[]> {
    return page.evaluate(() => JSON.parse(localStorage.getItem('mg:demo-bar') ?? '[]') as string[])
}

function isPreviewResponse(response: Response) {
    return response.url().includes('/api/cocktails/makeable-preview') && response.request().method() === 'POST'
}

async function tapBottle(page: Page, name: string) {
    const preview = page.waitForResponse(isPreviewResponse)
    await page.getByRole('button', { name, exact: true }).click()
    await preview
}

async function captureShare(page: Page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async (data: { url: string }) => {
                ;(window as unknown as { __shared: string }).__shared = data.url
            },
        })
    })
}

async function findRecipeOverlappingBar(request: APIRequestContext, barIds: string[]) {
    const list = await request.get('/api/cocktails?limit=40')
    const cocktails = ((await list.json()) as { data: { id: string }[] }).data
    for (const { id } of cocktails) {
        const detail = await request.get(`/api/cocktails/${id}`)
        const { data } = (await detail.json()) as { data: { ingredients: { ingredientId: string }[] } }
        const ingredientIds = data.ingredients.map(i => i.ingredientId)
        if (ingredientIds.some(i => barIds.includes(i))) return { id, ingredientIds }
    }
    throw new Error('No cocktail shares an ingredient with the bar')
}

test.describe('Landing flow', () => {
    test('a visitor builds a bar, reloads, shares it and sees it on a recipe', async ({ page, request }) => {
        await captureShare(page)
        const initialPreview = page.waitForResponse(isPreviewResponse)
        await page.goto('/')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

        await page.locator('#shelf').scrollIntoViewIfNeeded()
        await initialPreview
        const exampleCount = await readCount(page)
        expect(exampleCount).toBeGreaterThan(0)
        await expect(page.getByRole('button', { name: 'Bourbon', exact: true })).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByRole('button', { name: 'White rum', exact: true })).toHaveAttribute('aria-pressed', 'false')
        await expect(page.getByText('This is an example bar. Tap to make it yours.')).toBeVisible()

        await tapBottle(page, 'White rum')
        await expect(page.getByRole('button', { name: 'White rum', exact: true })).toHaveAttribute('aria-pressed', 'true')
        await expect.poll(() => menuCount(page).textContent(), { timeout: 30_000 }).not.toBe(String(exampleCount))
        const tappedCount = await readCount(page)
        expect(tappedCount).toBeGreaterThan(exampleCount)
        await expect(page.getByText('Your bar stays on this device until you save it.')).toBeVisible()
        const ids = await storedIds(page)
        expect(ids).toHaveLength(EXAMPLE_KEYS.length + 1)

        const reloadedPreview = page.waitForResponse(isPreviewResponse)
        await page.reload()
        await reloadedPreview
        await expect(page.getByRole('button', { name: 'White rum', exact: true })).toHaveAttribute('aria-pressed', 'true')
        expect(await readCount(page)).toBe(tappedCount)

        await page.getByRole('button', { name: 'Share my bar' }).first().click()
        await page.waitForFunction(() => '__shared' in window)
        const sharedUrl = await page.evaluate(() => (window as unknown as { __shared: string }).__shared)
        expect(new URL(sharedUrl).pathname).toBe('/bar')
        await page.goto(sharedUrl)
        await expect(
            page.getByRole('heading', { name: `This bar makes ${tappedCount} cocktail${tappedCount === 1 ? '' : 's'}` }),
        ).toBeVisible()

        const recipe = await findRecipeOverlappingBar(request, ids)
        await page.goto(`/cocktails/${recipe.id}`)
        const box = page.getByRole('region', { name: 'Can you make it?' })
        await expect(box).toBeVisible()
        const expectedChecked = new Set(recipe.ingredientIds.filter(i => ids.includes(i)))
        await expect(box.getByRole('checkbox', { checked: true })).toHaveCount(expectedChecked.size)
    })

    test('email sign-up carries the bar, sign-in saves it and the pantry lists it', async ({ page, context, request }) => {
        const bottles = await loadBottles(request)
        const nameById = new Map(bottles.flatMap(b => (b.ingredientId ? [[b.ingredientId, b.label] as const] : [])))

        await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route =>
            route.fulfill({
                contentType: 'application/javascript',
                body: `window.turnstile = {
                    render: (el, opts) => { setTimeout(() => opts.callback('e2e-token'), 0); return 'e2e-widget' },
                    reset: () => {}, remove: () => {}, getResponse: () => 'e2e-token', isExpired: () => false, execute: () => {}
                };
                (function () {
                    var query = document.currentScript && document.currentScript.src.split('?')[1];
                    var cb = query && new URLSearchParams(query).get('onload');
                    if (cb && window[cb]) window[cb]();
                })();`,
            }),
        )

        const initialPreview = page.waitForResponse(isPreviewResponse)
        await page.goto('/')
        await initialPreview
        await tapBottle(page, 'White rum')
        const ids = await storedIds(page)
        expect(ids.length).toBeGreaterThan(0)

        await page.getByRole('link', { name: 'Use email instead' }).first().click()
        await page.waitForURL(/\/signup/)

        let registerBody: { demoBar?: string[] } | null = null
        await page.route('**/api/auth/register', async route => {
            registerBody = route.request().postDataJSON()
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) })
        })

        await page.getByPlaceholder('Your name').fill('Landing Tester')
        await page.getByPlaceholder('you@example.com').fill('landing.tester@mixoguide.test')
        await page.getByPlaceholder('Create a password').fill('Str0ng!Passw0rd')
        await page.getByPlaceholder('Confirm your password').fill('Str0ng!Passw0rd')
        await page.getByRole('checkbox').nth(0).check()
        await page.getByRole('checkbox').nth(1).check()
        const submit = page.getByRole('button', { name: 'Create account' })
        await expect(submit).toBeEnabled()
        await submit.click()
        await page.waitForURL(/\/check-email/)
        expect(registerBody).not.toBeNull()
        expect([...(registerBody!.demoBar ?? [])].sort()).toEqual([...ids].sort())

        await setVisualSession(context, VISUAL_USER)
        const unmocked = await installMocks(page, { authed: true })

        let importBody: { ingredientIds?: string[] } | null = null
        await page.route('**/api/user-pantry-items/import-demo-bar', async route => {
            importBody = route.request().postDataJSON()
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: { imported: ids.length } }),
            })
        })
        await page.route('**/api/user-pantry-items?**', async route => {
            if (route.request().method() !== 'GET') return route.fallback()
            const items = ids.map((id, i) => ({
                id: `pantry-${i}`,
                userId: VISUAL_USER.id,
                ingredientId: id,
                quantity: 1,
                unitLeft: 'oz',
                favorite: false,
                expirationDate: null,
                isEssential: false,
                isInfinite: false,
                isInPantry: true,
                isInShoppingList: false,
                shoppingQuantity: 0,
                addedAt: '2026-05-26T10:00:00.000Z',
                note: null,
                updatedAt: null,
                ingredient: {
                    id,
                    name: nameById.get(id) ?? id,
                    imageUrl: null,
                    isAlcoholic: true,
                    type: { id: 'type-spirit', name: 'Spirit' },
                    subType: { id: 'subtype-fixture', name: 'Fixture' },
                },
            }))
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: items,
                    meta: { total: items.length, page: 1, limit: 500, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
                }),
            })
        })

        await page.goto('/')
        await expect(page.getByText(`Your bar is saved: ${ids.length} bottles`)).toBeVisible({ timeout: 30_000 })
        expect([...(importBody!.ingredientIds ?? [])].sort()).toEqual([...ids].sort())

        await page.goto('/pantry')
        for (const id of ids) {
            await expect(page.getByText(nameById.get(id) ?? id, { exact: true }).first()).toBeVisible()
        }
        expect(unmocked.filter(key => !key.startsWith('GET ')), 'unmocked mutation reached the app API').toEqual([])
    })

    test.describe('dark mode', () => {
        test.use({ colorScheme: 'dark' })

        test('no large near-white surface appears outside the hero', async ({ page }) => {
            const initialPreview = page.waitForResponse(isPreviewResponse)
            await page.goto('/')
            await page.locator('#shelf').scrollIntoViewIfNeeded()
            await initialPreview
            await page.waitForLoadState('networkidle')

            await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)
            const bodyLuminance = await page.evaluate(() => {
                const match = getComputedStyle(document.body).backgroundColor.match(/rgba?\(([^)]+)\)/)
                const [r, g, b] = (match?.[1] ?? '255,255,255').split(/[ ,/]+/).filter(Boolean).map(Number)
                return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
            })
            expect(bodyLuminance).toBeLessThan(0.25)

            const offenders = await page.evaluate(() => {
                const hero = document.querySelector('h1')?.closest('section') ?? null
                const found: string[] = []
                for (const el of Array.from(document.body.querySelectorAll('*'))) {
                    if (hero?.contains(el)) continue
                    const rect = el.getBoundingClientRect()
                    if (rect.width <= 200 || rect.height <= 200) continue
                    const match = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/)
                    if (!match) continue
                    const [r, g, b, a = 1] = match[1].split(/[ ,/]+/).filter(Boolean).map(Number)
                    if (a > 0.5 && r >= 235 && g >= 235 && b >= 235) {
                        found.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} ${Math.round(rect.width)}x${Math.round(rect.height)}`)
                    }
                }
                return found
            })
            expect(offenders).toEqual([])
        })
    })
})
