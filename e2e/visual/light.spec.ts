import { expect, test } from '@playwright/test'
import { openVisualPage } from './helpers'
import { VISUAL_PAGES } from './pages'

test.use({ viewport: { width: 1280, height: 800 } })

for (const visual of VISUAL_PAGES) {
    test(`light: ${visual.name}`, async ({ context, page }) => {
        test.setTimeout(90_000)

        const unmocked = await openVisualPage(context, page, visual, 'light')
        expect(unmocked).toEqual([])

        await expect(page).toHaveScreenshot(`${visual.name}.png`, {
            fullPage: true,
            maxDiffPixelRatio: 0.001,
            animations: 'disabled',
        })
    })
}
