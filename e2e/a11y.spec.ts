import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Automated accessibility scans (axe-core, WCAG 2.x A/AA rules).
 * Fails on `serious` and `critical` violations only; `moderate`/`minor` are
 * attached to the report for triage.
 *
 * Run only these: `npm run test:a11y` (or `npx playwright test --grep @a11y`).
 */

const PAGES = [
    { name: 'home', path: '/' },
    { name: 'cocktails', path: '/cocktails' },
    { name: 'signin', path: '/signin' },
    { name: 'signup', path: '/signup' },
] as const

const THEMES = ['light', 'dark'] as const

const BLOCKING_IMPACTS = new Set(['serious', 'critical'])

async function scan(page: Page) {
    return new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Third-party iframes (Turnstile, ads) are outside our control.
        .exclude('iframe')
        .analyze()
}

test.describe('accessibility @a11y', () => {
    test.use({ viewport: { width: 1280, height: 800 } })
    test.setTimeout(60_000)

    for (const theme of THEMES) {
        for (const { name, path } of PAGES) {
            test(`${name} (${theme}) has no serious or critical axe violations`, async ({ page }, testInfo) => {
                await page.emulateMedia({ colorScheme: theme })
                await page.goto(path)
                await page.waitForLoadState('networkidle')

                const results = await scan(page)

                await testInfo.attach(`axe-${name}-${theme}.json`, {
                    body: JSON.stringify(results.violations, null, 2),
                    contentType: 'application/json',
                })

                const blocking = results.violations
                    .filter((v) => v.impact && BLOCKING_IMPACTS.has(v.impact))
                    .map((v) => ({
                        id: v.id,
                        impact: v.impact,
                        help: v.help,
                        targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
                    }))

                expect(blocking, `serious/critical axe violations on ${path} (${theme})`).toEqual([])
            })
        }
    }
})
