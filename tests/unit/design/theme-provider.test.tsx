import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const { captured } = vi.hoisted(() => ({ captured: { props: null as Record<string, unknown> | null } }))

vi.mock('next-themes', () => ({
    ThemeProvider: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
        captured.props = props
        return React.createElement('div', null, props.children)
    },
}))

async function renderWith(mode: string | undefined, nodeEnv = 'test') {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', nodeEnv)
    if (mode !== undefined) vi.stubEnv('NEXT_PUBLIC_DARK_MODE', mode)
    const { ThemeProvider } = await import('@/providers/theme-provider')
    renderToStaticMarkup(React.createElement(ThemeProvider, null, 'child'))
    return captured.props!
}

describe('ThemeProvider release gate', () => {
    beforeEach(() => {
        captured.props = null
    })
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('forces light when NEXT_PUBLIC_DARK_MODE=off', async () => {
        const props = await renderWith('off')
        expect(props.forcedTheme).toBe('light')
    })

    it('defaults to on when unset', async () => {
        const props = await renderWith(undefined)
        expect(props.forcedTheme).toBeUndefined()
    })

    it('enables system theming when NEXT_PUBLIC_DARK_MODE=on', async () => {
        const props = await renderWith('on')
        expect(props).toMatchObject({
            attribute: 'class',
            defaultTheme: 'system',
            enableSystem: true,
            disableTransitionOnChange: true,
        })
        expect(props.forcedTheme).toBeUndefined()
    })

    it('preview is available outside production only', async () => {
        expect((await renderWith('preview', 'development')).forcedTheme).toBeUndefined()
        expect((await renderWith('preview', 'production')).forcedTheme).toBe('light')
    })
})
