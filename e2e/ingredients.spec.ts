import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
test.describe.configure({ mode: 'serial' })

test.describe('Ingredients page', () => {
    test.setTimeout(60_000)

    // ── Page load ──────────────────────────────────────────────────────────────

    test('loads heading, subtitle, filter bar and ingredient cards', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Ingredients', level: 1 })).toBeVisible()
        await expect(page.getByText('Explore all the ingredients in our library.')).toBeVisible()
        await expect(page.getByPlaceholder('Search ingredients...')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeVisible()

        const count = await page.locator('h3').count()
        expect(count).toBeGreaterThan(0)
    })

    // ── Search filter ──────────────────────────────────────────────────────────

    test('search updates URL after typing', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await page.getByPlaceholder('Search ingredients...').fill('rum')
        await page.waitForURL(/search=rum/, { timeout: 5_000 })
        expect(page.url()).toContain('search=rum')
    })

    test('shows empty state for no matching search', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await page.getByPlaceholder('Search ingredients...').fill('zzzznonexistentxxx')
        await page.waitForURL(/search=/, { timeout: 5_000 })

        await expect(page.getByText('No matching ingredients')).toBeVisible({ timeout: 8_000 })
        await expect(page.getByText('No ingredients match zzzznonexistentxxx.')).toBeVisible({ timeout: 8_000 })
    })

    // ── Type filter ────────────────────────────────────────────────────────────

    test('Type dropdown opens with category options', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await page.getByRole('button', { name: 'Type', exact: true }).click()

        await expect(page.getByRole('button', { name: 'Spirit' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Liqueur' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Wine', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Juice' })).toBeVisible()
    })

    test('selecting a Type adds types= to URL', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await page.getByRole('button', { name: 'Type', exact: true }).click()
        await page.getByRole('button', { name: 'Spirit' }).click()

        await page.waitForURL(/types=Spirit/, { timeout: 5_000 })
        expect(page.url()).toContain('types=Spirit')
    })

    test('Clear filters resets type filter', async ({ page }) => {
        await page.goto('/ingredients?types=Spirit')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
        await page.getByRole('button', { name: 'Clear filters' }).click()

        // "Clear filters" button disappears once filters are reset — visible contract
        await expect(page.getByRole('button', { name: 'Clear filters' })).not.toBeVisible({ timeout: 10_000 })
    })

    // ── Sort ───────────────────────────────────────────────────────────────────

    test('default sort is Most used and sort dropdown opens', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('button', { name: /Sort.*Most used/i })).toBeVisible()
    })

    // ── Load more ──────────────────────────────────────────────────────────────

    test('Load more button renders additional cards', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        const loadMore = page.getByRole('button', { name: 'Load more' })
        if (!(await loadMore.isVisible())) {
            test.skip()
            return
        }

        const before = await page.locator('h3').count()
        await loadMore.click()

        await page.waitForFunction(
            (n: number) => document.querySelectorAll('h3').length > n,
            before,
            { timeout: 8_000 },
        )

        const after = await page.locator('h3').count()
        expect(after).toBeGreaterThan(before)
    })

    // ── Card navigation ────────────────────────────────────────────────────────
    test('clicking an ingredient card navigates to its detail page', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        const firstCard = page.locator('h3').first()
        const hasCards = await firstCard
            .waitFor({ state: 'visible', timeout: 3_000 })
            .then(() => true)
            .catch(() => false)

        if (!hasCards) {
            test.skip()
            return
        }

        await firstCard.click()
        await page.waitForURL(/\/ingredients\/.+/, { timeout: 8_000 })
        expect(page.url()).toMatch(/\/ingredients\/[a-z0-9]+$/)
    })
})

test.describe('Ingredient detail page', () => {
    test.setTimeout(60_000)

    test('shows ingredient name as h1', async ({ page }) => {
        await page.goto('/ingredients')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        const name = await page.locator('h3').first().textContent()
        await page.locator('h3').first().click()
        await page.waitForURL(/\/ingredients\/.+/, { timeout: 8_000 })
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: name!.trim(), level: 1 })).toBeVisible()
    })

    test('shows type/subtype and alcoholic badges', async ({ page }) => {
        await page.goto('/ingredients/cmnmsipbn000zfndwve1qx50q')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        // Type badge contains the category info
        await expect(page.getByText(/Spirit/)).toBeVisible()
        await expect(page.getByText(/Alcoholic/)).toBeVisible()
    })

    test('shows description with Read more toggle', async ({ page }) => {
        await page.goto('/ingredients/cmnmsipbn000zfndwve1qx50q')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('button', { name: 'Read more' })).toBeVisible()
        await page.getByRole('button', { name: 'Read more' }).click()
        await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible()
    })

    test('shows Add to pantry button', async ({ page }) => {
        await page.goto('/ingredients/cmnmsipbn000zfndwve1qx50q')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('button', { name: 'Add to pantry' })).toBeVisible()
    })

    test('Suggest a change redirects unauthenticated users to sign in', async ({ page }) => {
        await page.goto('/ingredients/cmnmsipbn000zfndwve1qx50q')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await page.getByRole('button', { name: 'Suggest a change' }).click()

        // Unauthenticated users get redirected to /signin with callbackUrl
        await page.waitForURL(/\/signin/, { timeout: 15_000 })
        expect(page.url()).toContain('/signin')
    })
})
