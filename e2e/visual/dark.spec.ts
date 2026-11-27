import { expect, test, type Page } from '@playwright/test'
import { openVisualPage } from './helpers'
import { VISUAL_PAGES } from './pages'

test.use({ viewport: { width: 1280, height: 800 } })

async function findNearWhiteBlocks(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const found: string[] = []
        const channel = (v: number) => {
            const c = v / 255
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
        }
        for (const el of Array.from(document.body.querySelectorAll('*'))) {
            if (el.closest('svg, img, video, picture, canvas')) continue
            const rect = el.getBoundingClientRect()
            if (rect.width <= 200 || rect.height <= 200) continue
            const style = getComputedStyle(el)
            if (style.backgroundImage.includes('url(')) continue
            const m = style.backgroundColor.match(/rgba?\(([^)]+)\)/)
            if (!m) continue
            const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
            if (a < 0.5) continue
            const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
            if (luminance <= 0.8) continue
            const classes = String(el.getAttribute('class') ?? '').split(/\s+/).slice(0, 3).join('.')
            found.push(`${el.tagName.toLowerCase()}.${classes} ${Math.round(rect.width)}x${Math.round(rect.height)} ${style.backgroundColor}`)
        }
        return found
    })
}

for (const visual of VISUAL_PAGES) {
    test(`dark: ${visual.name}`, async ({ context, page }) => {
        test.setTimeout(90_000)

        const unmocked = await openVisualPage(context, page, visual, 'dark')
        expect(unmocked).toEqual([])

        await expect(page.locator('html')).toHaveClass(/\bdark\b/)
        expect.soft(await findNearWhiteBlocks(page), 'elements over 200x200 with a near-white background').toEqual([])

        await expect(page).toHaveScreenshot(`${visual.name}.png`, {
            fullPage: true,
            threshold: 0.05,
            maxDiffPixelRatio: 0.001,
            animations: 'disabled',
        })
    })
}
