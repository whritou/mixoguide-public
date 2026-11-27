import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { ThemeRadioItems, ThemeToggleView, THEME_OPTIONS } from '@/components/layout/ThemeToggle'

function walk(node: React.ReactNode, visit: (el: React.ReactElement<Record<string, unknown>>) => void) {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, visit))
    if (!React.isValidElement(node)) return
    const el = node as React.ReactElement<Record<string, unknown>>
    visit(el)
    walk(el.props.children as React.ReactNode, visit)
}

describe('ThemeToggle', () => {
    it('offers Light, Dark and System', () => {
        expect(THEME_OPTIONS.map((o) => o.label)).toEqual(['Light', 'Dark', 'System'])
        const labels: unknown[] = []
        walk(ThemeRadioItems({ theme: 'system', onChange: () => {} }), (el) => {
            if (typeof el.props.value === 'string' && typeof el.props.children === 'string') labels.push(el.props.children)
        })
        expect(labels).toEqual(['Light', 'Dark', 'System'])
    })

    it('marks the current choice and calls setTheme("dark") on selection', () => {
        const onChange = vi.fn()
        const group = ThemeRadioItems({ theme: 'system', onChange }) as React.ReactElement<{
            value: string
            onValueChange: (v: string) => void
        }>
        expect(group.props.value).toBe('system')
        group.props.onValueChange('dark')
        expect(onChange).toHaveBeenCalledWith('dark')
    })

    it('exposes an icon button labelled Theme and checks nothing before mount', () => {
        const view = ThemeToggleView({ mounted: false, theme: 'dark', resolvedTheme: 'dark', onChange: () => {} })
        let label: unknown
        let checked: unknown = 'unset'
        walk(view, (el) => {
            if (el.type === 'button') label = el.props['aria-label']
            if (el.type === ThemeRadioItems) checked = el.props.theme
        })
        expect(label).toBe('Theme')
        expect(checked).toBeUndefined()
    })
})
