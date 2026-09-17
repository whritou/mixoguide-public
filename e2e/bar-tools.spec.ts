import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
test.describe.configure({ mode: 'serial' })

test.describe('Bar Tools page', () => {
    test.setTimeout(60_000)

    // ── Page load ──────────────────────────────────────────────────────────────

    test('shows main heading and subtitle', async ({ page }) => {
        await page.goto('/bar-tools')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Bar Tools & Techniques', level: 1 })).toBeVisible()
        await expect(page.getByText(/tools that live on your bar top/i)).toBeVisible()
    })

    // ── Essential Bar Tools section ────────────────────────────────────────────

    test('shows Essential Bar Tools section', async ({ page }) => {
        await page.goto('/bar-tools')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Essential Bar Tools', level: 2 })).toBeVisible()
    })

    test('shows individual tool cards', async ({ page }) => {
        await page.goto('/bar-tools')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Shaker', level: 3 })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Jigger', level: 3 })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Strainer', level: 3, exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Bar Spoon', level: 3 })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Muddler', level: 3 })).toBeVisible()
    })

    // ── Core Techniques section ────────────────────────────────────────────────

    test('shows Core Techniques section', async ({ page }) => {
        await page.goto('/bar-tools')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Core Techniques', level: 2 })).toBeVisible()
    })

    test('shows technique cards', async ({ page }) => {
        await page.goto('/bar-tools')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Shaken', level: 3 })).toBeVisible()
    })

    // ── Page title ─────────────────────────────────────────────────────────────

    test('has correct browser tab title', async ({ page }) => {
        await page.goto('/bar-tools')
        await expect(page).toHaveTitle(/MixoGuide/)
    })
})
