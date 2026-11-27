import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Eyebrow } from '@/components/ui/eyebrow'
import { DecoDivider } from '@/components/ui/deco-divider'
import { Button, buttonVariants } from '@/components/ui/button'

const DEFAULT_VARIANT_BEFORE_PILL =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9 px-4 py-2 has-[>svg]:px-3'

describe('Eyebrow', () => {
    it('renders a span with the eyebrow typography classes', () => {
        const html = renderToStaticMarkup(React.createElement(Eyebrow, null, 'Est. 2026'))
        expect(html.startsWith('<span')).toBe(true)
        expect(html).toContain('tracking-[.28em]')
        expect(html).toContain('text-brand')
        expect(html).toContain('text-[10px]')
        expect(html).toContain('uppercase')
        expect(html).toContain('Est. 2026')
    })

    it('appends a custom className', () => {
        const html = renderToStaticMarkup(<Eyebrow className="mb-4">x</Eyebrow>)
        expect(html).toContain('mb-4')
    })
})

describe('DecoDivider', () => {
    it('is aria-hidden and draws a brass hairline, a diamond and a hairline', () => {
        const html = renderToStaticMarkup(React.createElement(DecoDivider))
        expect(html).toContain('aria-hidden="true"')
        expect(html).toContain('◆')
        expect(html).toContain('text-brand')
        expect(html).toContain('bg-line-brass')
        expect(html.match(/bg-line-brass/g)?.length).toBe(2)
    })

    it('appends a custom className', () => {
        const html = renderToStaticMarkup(React.createElement(DecoDivider, { className: 'my-8' }))
        expect(html).toContain('my-8')
    })
})

describe('buttonVariants', () => {
    it('pill variant uses the gradient, glow and full rounding', () => {
        const classes = buttonVariants({ variant: 'pill' })
        expect(classes).toContain('rounded-full')
        expect(classes).toContain('uppercase')
        expect(classes).toContain('tracking-[.12em]')
        expect(classes).toContain('text-[11px]')
        expect(classes).toContain('bg-gradient-to-br')
        expect(classes).toContain('from-brand-gradient-from')
        expect(classes).toContain('to-brand-gradient-to')
        expect(classes).toContain('text-fg-on-brand')
        expect(classes).toContain('shadow-glow')
    })

    it('default variant output is unchanged', () => {
        expect(buttonVariants({ variant: 'default' })).toBe(DEFAULT_VARIANT_BEFORE_PILL)
        expect(buttonVariants()).toBe(DEFAULT_VARIANT_BEFORE_PILL)
    })

    it('Button renders the pill variant', () => {
        const html = renderToStaticMarkup(React.createElement(Button, { variant: 'pill' }, 'Go'))
        expect(html).toContain('rounded-full')
        expect(html).toContain('shadow-glow')
    })
})
