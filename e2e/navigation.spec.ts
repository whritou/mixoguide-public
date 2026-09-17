import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
test.describe.configure({ mode: 'serial' })

test.describe('Navigation', () => {
    test.setTimeout(60_000)

    // ── Nav bar links ──────────────────────────────────────────────────────────

    test('logo link navigates to home', async ({ page }) => {
        await page.goto('/cocktails')
        await page.getByRole('link', { name: 'Mixoguide', exact: true }).click()
        await expect(page).toHaveURL('/')
    })

    test('Cocktails nav link navigates to /cocktails', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('navigation').getByRole('link', { name: 'Cocktails' }).click()
        await expect(page).toHaveURL('/cocktails')
    })

    test('Ingredients nav link navigates to /ingredients', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('navigation').getByRole('link', { name: 'Ingredients' }).click()
        await expect(page).toHaveURL('/ingredients')
    })

    test('Bar Tools nav link navigates to /bar-tools', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('navigation').getByRole('link', { name: 'Bar Tools' }).click()
        await expect(page).toHaveURL('/bar-tools')
    })

    // ── Auth links ─────────────────────────────────────────────────────────────

    test('Sign in nav link navigates to /signin', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('navigation').getByRole('link', { name: 'Sign in' }).click()
        await expect(page).toHaveURL(/\/signin/)
    })

    test('Sign up nav link navigates to /signup', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('navigation').getByRole('link', { name: 'Sign up' }).click()
        await expect(page).toHaveURL(/\/signup/)
    })

    // ── Footer links ───────────────────────────────────────────────────────────

    test('footer Cocktails link navigates to /cocktails', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('contentinfo').getByRole('link', { name: 'Cocktails' }).click()
        await expect(page).toHaveURL('/cocktails')
    })

    test('footer Privacy Policy link navigates to /privacy-policy', async ({ page }) => {
        await page.goto('/')
        const privacyLink = page.getByRole('contentinfo').getByRole('link', { name: 'Privacy Policy' })
        await Promise.all([
            page.waitForURL(/\/privacy-policy$/, { timeout: 30_000 }),
            privacyLink.click(),
        ])
    })

    test('footer Terms of Use link navigates to /terms-of-use', async ({ page }) => {
        await page.goto('/')
        const termsLink = page.getByRole('contentinfo').getByRole('link', { name: 'Terms of Use' })
        await Promise.all([
            page.waitForURL(/\/terms-of-use$/, { timeout: 30_000 }),
            termsLink.click(),
        ])
    })

    test('footer Cookie Policy link navigates to /cookie-policy', async ({ page }) => {
        await page.goto('/')
        const cookieLink = page.getByRole('contentinfo').getByRole('link', { name: 'Cookie Policy' })
        await Promise.all([
            page.waitForURL(/\/cookie-policy$/, { timeout: 30_000 }),
            cookieLink.click(),
        ])
    })

    // ── Cross-page routing ─────────────────────────────────────────────────────

    test('can navigate between Cocktails and Ingredients via nav', async ({ page }) => {
        await page.goto('/cocktails')
        await page.getByRole('navigation').getByRole('link', { name: 'Ingredients' }).click()
        await page.waitForURL('/ingredients', { timeout: 8_000 })

        await page.getByRole('navigation').getByRole('link', { name: 'Cocktails' }).click()
        await page.waitForURL('/cocktails', { timeout: 8_000 })
    })
})
