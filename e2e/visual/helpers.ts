import type { BrowserContext, Page } from '@playwright/test'
import { installMocks } from './mocks'
import { FIXED_NOW, VISUAL_ADMIN, VISUAL_USER, type VisualPage } from './pages'
import { setVisualSession } from './session'

export async function openVisualPage(
    context: BrowserContext,
    page: Page,
    visual: VisualPage,
    colorScheme: 'light' | 'dark',
): Promise<string[]> {
    if (visual.auth) {
        await setVisualSession(context, visual.path.startsWith('/admin') ? VISUAL_ADMIN : VISUAL_USER)
    }
    const unmocked = await installMocks(page, { authed: visual.auth })

    await page.addInitScript(() => {
        // The Next and React Query dev overlays are fixed-position and would be baked into every screenshot.
        new MutationObserver(() => document.querySelectorAll('nextjs-portal, .tsqd-parent-container').forEach((el) => el.remove())).observe(document, {
            childList: true,
            subtree: true,
        })
    })
    await page.clock.setFixedTime(FIXED_NOW)
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto(visual.path)
    await page.waitForLoadState('networkidle')

    await page.evaluate(async () => {
        await document.fonts.ready
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y)
            await new Promise((resolve) => setTimeout(resolve, 150))
        }
        window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(1000)
    await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete))

    return unmocked
}
