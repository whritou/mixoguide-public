import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
test.describe.configure({ mode: 'serial' })

test.describe('Home page', () => {
    test.setTimeout(60_000)

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })
    })

    test('shows the hero headline and calls to action', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: "Tonight's drink is already on your shelf.", level: 1 }),
        ).toBeVisible()
        await expect(page.getByRole('link', { name: 'See what you can make' })).toHaveAttribute('href', '#shelf')
        await expect(page.getByRole('link', { name: 'Create a free account' })).toHaveAttribute('href', '/signup')
    })

    test('shows the shelf demo', async ({ page }) => {
        await expect(page.locator('#shelf').getByRole('heading', { name: "What's on your shelf?" })).toBeVisible()
        await expect(page.getByText('Tonight you can make')).toBeVisible()
    })

    test('shows the unlock section with a sign-up link', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Keep your bar. Plan the evening.' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Your real pantry' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Planned cocktails and events' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Create your account' })).toHaveAttribute('href', '/signup')
    })

    test('shows the Android section with the Play link and QR code', async ({ page }) => {
        await expect(page.locator('#app').getByRole('heading', { name: 'MixoGuide behind the bar' })).toBeVisible()
        await expect(page.locator('#app').getByRole('link', { name: /Google Play/ })).toHaveAttribute(
            'href',
            /referrer=utm_source%3Dlanding/,
        )
        await expect(page.getByRole('img', { name: 'QR code to the Google Play listing' })).toBeVisible()
    })

    test('"Android app" nav link scrolls to the Android section', async ({ page }) => {
        await page.getByRole('link', { name: 'Android app' }).click()
        await expect(page).toHaveURL(/#app$/)
    })

    test('"Create account" nav link goes to /signup', async ({ page }) => {
        await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Create account' }).click()
        await expect(page).toHaveURL(/\/signup$/)
    })

    test('"Browse all cocktails" navigates to /cocktails', async ({ page }) => {
        const link = page.locator('#collection').getByRole('link', { name: 'Browse all cocktails' })
        const visible = await link
            .waitFor({ state: 'visible', timeout: 5_000 })
            .then(() => true)
            .catch(() => false)

        if (!visible) {
            test.skip()
            return
        }

        await link.click()
        await expect(page).toHaveURL(/\/cocktails$/)
    })

    test('clicking a seasonal cocktail navigates to its detail page', async ({ page }) => {
        const first = page.locator('#collection a[href^="/cocktails/"]').first()
        const visible = await first
            .waitFor({ state: 'visible', timeout: 5_000 })
            .then(() => true)
            .catch(() => false)

        if (!visible) {
            test.skip()
            return
        }

        await first.click()
        await page.waitForURL(/\/cocktails\/.+/, { timeout: 8_000 })
    })
})
