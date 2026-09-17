import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })

// Run serially per browser to avoid overloading the Next.js dev server
test.describe.configure({ mode: 'serial' })

test.describe('Cocktails page', () => {
    // Give each test a 60s budget — networkidle on a dev server can be slow
    test.setTimeout(60_000)

    // ── 1. Page load ──────────────────────────────────────────────────────────

    test('loads heading, subtitle, filter bar and cocktail cards', async ({ page }) => {
        await page.goto('/cocktails')
        await page.waitForLoadState('networkidle', { timeout: 30_000 })

        await expect(page.getByRole('heading', { name: 'Cocktails', level: 1 })).toBeVisible()
        await expect(page.getByText('Browse our full collection')).toBeVisible()
        await expect(page.getByPlaceholder('Search cocktails...')).toBeVisible()

        const count = await page.locator('h3').count()
        expect(count).toBeGreaterThan(0)
    })

    // ── 2. Search filter ──────────────────────────────────────────────────────

    test.describe('Search filter', () => {
        test('updates URL after typing (debounced)', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByPlaceholder('Search cocktails...').fill('margarita')
            await page.waitForURL(/search=margarita/, { timeout: 5_000 })

            expect(page.url()).toContain('search=margarita')
        })

        test('clears search when X button is clicked', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByPlaceholder('Search cocktails...').fill('margarita')
            await page.waitForURL(/search=/, { timeout: 5_000 })

            await page.getByRole('button', { name: 'Clear cocktail search' }).click()
            await page.waitForURL((url) => !url.searchParams.has('search'), { timeout: 8_000 })
            await expect(page.getByPlaceholder('Search cocktails...')).toHaveValue('')
        })

        test('shows empty state when no results match', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByPlaceholder('Search cocktails...').fill('zzzznonexistentxxx')
            await page.waitForURL(/search=/, { timeout: 5_000 })

            await expect(page.getByText('No matching cocktails')).toBeVisible({ timeout: 8_000 })
            await expect(page.getByText('No cocktails match zzzznonexistentxxx.')).toBeVisible({ timeout: 8_000 })
        })
    })

    // ── 3. Difficulty filter ──────────────────────────────────────────────────

    test.describe('Difficulty filter', () => {
        test('opens dropdown with Easy / Medium / Hard options', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: 'Difficulty' }).click()

            await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Medium' })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Hard' })).toBeVisible()
        })

        test('selecting Easy adds difficulty=easy to URL and renames the button', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: 'Difficulty' }).click()
            await page.getByRole('button', { name: 'Easy' }).click()

            await page.waitForURL(/difficulty=easy/, { timeout: 5_000 })
            expect(page.url()).toContain('difficulty=easy')

            // Filter pill label changes — "Difficulty" is gone
            await expect(page.getByRole('button', { name: 'Difficulty' })).not.toBeVisible()
        })

        test('resets difficulty when All is selected', async ({ page }) => {
            await page.goto('/cocktails?difficulty=easy')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            // Pill label is now "Easy" — click it to open dropdown, wait for "All" to appear, then click it
            await page.getByRole('button', { name: /^Easy$/ }).first().click()
            const allOption = page.getByRole('button', { name: /^All$/ }).first()
            await expect(allOption).toBeVisible()
            await allOption.click()

            // Pill reverts to "Difficulty" — visible contract that the filter has been cleared
            await expect(page.getByRole('button', { name: 'Difficulty' })).toBeVisible({ timeout: 10_000 })
        })
    })

    // ── 4. ABV filter ─────────────────────────────────────────────────────────

    test.describe('ABV filter', () => {
        test('opens dropdown with Alcoholic / Non-alcoholic options', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: 'ABV' }).click()

            await expect(page.getByRole('button', { name: 'Alcoholic', exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Non-alcoholic' })).toBeVisible()
        })

        test('selecting Alcoholic adds alcoholic=true to URL', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: 'ABV' }).click()
            await expect(page.getByRole('button', { name: 'Alcoholic', exact: true })).toBeVisible()
            await page.getByRole('button', { name: 'Alcoholic', exact: true }).click()

            await page.waitForURL(/alcoholic=true/, { timeout: 5_000 })
            expect(page.url()).toContain('alcoholic=true')
        })

        test('resets ABV when All is selected', async ({ page }) => {
            await page.goto('/cocktails?alcoholic=true')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            // Pill label is now "Alcoholic" — open dropdown, wait for "All", then click
            await page.getByRole('button', { name: 'Alcoholic', exact: true }).click()
            const allOption = page.getByRole('button', { name: /^All$/ }).first()
            await expect(allOption).toBeVisible()
            await allOption.click()

            // Pill reverts to "ABV" — visible contract that the filter has been cleared
            await expect(page.getByRole('button', { name: 'ABV' })).toBeVisible({ timeout: 10_000 })
        })
    })

    // ── 5. Sort ───────────────────────────────────────────────────────────────

    test.describe('Sort', () => {
        test('opens dropdown with all sort options', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: /Sort/ }).click()

            await expect(page.getByRole('button', { name: 'Highest rated', exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Most popular' })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Quickest' })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Newest' })).toBeVisible()
            await expect(page.getByRole('button', { name: 'A - Z' })).toBeVisible()
        })

        test('selecting A-Z sets sortBy=name&sortOrder=asc and updates button label', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: /Sort/ }).click()
            await page.getByRole('button', { name: 'A - Z' }).click()

            await page.waitForURL(/sortBy=name/, { timeout: 5_000 })
            const url = page.url()
            expect(url).toContain('sortBy=name')
            expect(url).toContain('sortOrder=asc')

            // Sort pill reflects new selection and dropdown is closed
            await expect(page.getByRole('button', { name: /Sort.*A.*Z/ })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Highest rated', exact: true })).not.toBeVisible()
        })
    })

    // ── 6. Flavor filter ──────────────────────────────────────────────────────

    test.describe('Flavor filter', () => {
        test('opens chip panel with flavor options', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: /Flavor/ }).click()

            await expect(page.getByRole('button', { name: 'Bitter' })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Citrus' })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Sweet' })).toBeVisible()
        })

        test('selecting a flavor chip adds flavors= to URL', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: /Flavor/ }).click()
            await page.getByRole('button', { name: 'Bitter' }).click()

            await page.waitForURL(/flavors=bitter/, { timeout: 5_000 })
            expect(page.url()).toContain('flavors=bitter')
        })

        test('clicking Flavor pill again collapses the chip panel', async ({ page }) => {
            await page.goto('/cocktails')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: /Flavor/ }).click()
            await expect(page.getByRole('button', { name: 'Bitter' })).toBeVisible()

            await page.getByRole('button', { name: /Flavor/ }).click()
            await expect(page.getByRole('button', { name: 'Bitter' })).not.toBeVisible()
        })
    })

    // ── 7. Load more ──────────────────────────────────────────────────────────

    test.describe('Load more', () => {
        test('renders more cards after clicking Load more', async ({ page }) => {
            await page.goto('/cocktails')
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
    })

    // ── 8. Card click ─────────────────────────────────────────────────────────

    test.describe('Cocktail card', () => {
        test('clicking a card navigates to its detail page', async ({ page }) => {
            await page.goto('/cocktails')
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
            await page.waitForURL(/\/cocktails\/.+/, { timeout: 15_000 })
            expect(page.url()).toMatch(/\/cocktails\/[a-z0-9]+$/)
        })
    })

    // ── 9. Clear filters ──────────────────────────────────────────────────────

    test.describe('Clear filters', () => {
        test('Clear filters button is visible when a filter is active', async ({ page }) => {
            await page.goto('/cocktails?difficulty=easy')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
        })

        test('clicking Clear filters removes all filter params from the URL', async ({ page }) => {
            await page.goto('/cocktails?difficulty=easy&alcoholic=true')
            await page.waitForLoadState('networkidle', { timeout: 30_000 })

            await page.getByRole('button', { name: 'Clear filters' }).click()

            await page.waitForURL(
                url => !url.searchParams.has('difficulty') && !url.searchParams.has('alcoholic'),
                { timeout: 5_000 },
            )

            const url = page.url()
            expect(url).not.toContain('difficulty=')
            expect(url).not.toContain('alcoholic=')

            await expect(page.getByRole('button', { name: 'Clear filters' })).not.toBeVisible()
        })
    })
})
