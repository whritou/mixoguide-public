import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
test.describe.configure({ mode: 'serial' })

test.describe('Home page', () => {
    test.setTimeout(60_000)

    // ── Page load ──────────────────────────────────────────────────────────────

    test('shows hero heading and subtitle', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: /Mixoguide.*Art of the Pour/i, level: 1 })).toBeVisible()
    })

    test('shows KPI stats section', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: '400 +' })).toBeVisible()
        await expect(page.getByRole('heading', { name: '300 +' })).toBeVisible()
        await expect(page.getByRole('heading', { name: '40 +' })).toBeVisible()
    })

    test('shows features section headings', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Your personal bar — elevated' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Track Your Pantry' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Discover What You Can Make' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Plan Your Evening' })).toBeVisible()
    })

    test('shows bar tools section heading', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Master your tools & techniques' })).toBeVisible()
    })

    test('shows sign-up CTA section', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Unlock Your Full Bar Experience' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Sign up' }).first()).toBeVisible()
    })

    test('shows curated cocktail recommendations', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Curated Recommendations' })).toBeVisible()
        const cards = page.locator('h3')
        await expect(cards.first()).toBeVisible()
    })

    // ── CTA navigation ─────────────────────────────────────────────────────────

    test('"Explore Library" link navigates to /cocktails', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await page.getByRole('link', { name: 'Explore Library' }).click()
        await expect(page).toHaveURL('/cocktails')
    })

    test('"Explore Cocktails →" link navigates to /cocktails', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await page.getByRole('link', { name: /Explore Cocktails/ }).click()
        await expect(page).toHaveURL('/cocktails')
    })

    test('"Explore the Guide" link navigates to /bar-tools', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await page.getByRole('link', { name: 'Explore the Guide' }).click()
        await expect(page).toHaveURL('/bar-tools')
    })

    test('clicking a recommendation card navigates to cocktail detail', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        const section = page.getByRole('heading', { name: 'Curated Recommendations' })
        const sectionVisible = await section
            .waitFor({ state: 'visible', timeout: 5_000 })
            .then(() => true)
            .catch(() => false)

        if (!sectionVisible) {
            test.skip()
            return
        }

        const firstCard = page.locator('[class*="cursor-pointer"] h3').first()
        await firstCard.click()
        await page.waitForURL(/\/cocktails\/.+/, { timeout: 8_000 })
        expect(page.url()).toMatch(/\/cocktails\/[a-z0-9]+$/)
    })
})
