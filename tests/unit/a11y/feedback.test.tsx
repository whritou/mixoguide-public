import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const { errorSpy } = vi.hoisted(() => ({ errorSpy: vi.fn() }))
vi.mock('sonner', () => ({
    Toaster: () => null,
    toast: Object.assign(() => undefined, { error: errorSpy, success: vi.fn() }),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: () => <div data-turnstile /> }))

import { toast } from 'sonner'
import { TOAST_DURATION_MS, TOAST_ERROR_DURATION_MS } from '@/components/ui/sonner'
import Loader from '@/components/ui/Loader'
import TurnstileWidget from '@/components/ui/TurnstileWidget'

describe('Toaster timing — A11Y-003', () => {
    it('keeps toasts up long enough to read', () => {
        expect(TOAST_DURATION_MS).toBeGreaterThanOrEqual(6000)
        expect(TOAST_ERROR_DURATION_MS).toBeGreaterThan(TOAST_DURATION_MS)
    })

    it('gives error toasts the longer duration by default, but lets callers override', () => {
        toast.error('Boom')
        expect(errorSpy).toHaveBeenLastCalledWith('Boom', { duration: TOAST_ERROR_DURATION_MS })
        toast.error('Boom', { duration: 1234 })
        expect(errorSpy).toHaveBeenLastCalledWith('Boom', { duration: 1234 })
    })
})

describe('Loader — A11Y-019 / PERF-004', () => {
    it.each(['page', 'card', 'spinner', 'inline'] as const)('%s variant is a polite status with text', (variant) => {
        const html = renderToStaticMarkup(<Loader variant={variant} />)
        expect(html).toContain('role="status"')
        expect(html).toContain('Loading…')
    })

    it('animations stop under prefers-reduced-motion', () => {
        const html = renderToStaticMarkup(<Loader variant="card" />)
        expect(html).toContain('motion-reduce:animate-none')
    })
})

describe('TurnstileWidget — explains a disabled submit', () => {
    it('renders an alert when the site key is missing', () => {
        const prev = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const html = renderToStaticMarkup(<TurnstileWidget onSuccess={() => {}} action="signin" />)
            expect(html).toContain('role="alert"')
            expect(html).toMatch(/security check is unavailable/i)
        } finally {
            spy.mockRestore()
            if (prev !== undefined) process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = prev
        }
    })
})
