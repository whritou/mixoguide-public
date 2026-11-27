import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FieldConfig } from '@/components/crud/types'

const { mockUseForm } = vi.hoisted(() => ({
    mockUseForm: vi.fn(() => ({
        control: {},
        handleSubmit: (handler: (data: Record<string, unknown>) => unknown) => (event?: { preventDefault?: () => void }) => {
            event?.preventDefault?.()
            return handler({ name: 'Martini', strength: 5 })
        },
    })),
}))

function el(type: string, props: Record<string, unknown>, ...children: React.ReactNode[]) {
    return React.createElement(type, props, ...children)
}

vi.mock('react-hook-form', async () => ({
    useForm: mockUseForm,
    FormProvider: ({ children }: { children: React.ReactNode }) => el('div', { 'data-form-provider': true }, children),
}))

vi.mock('@/components/ui/form', async () => ({
    Form: ({ children }: { children: React.ReactNode }) => el('div', { 'data-form': true }, children),
}))

vi.mock('@/components/ui/card', async () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => el('section', { className, 'data-card': true }, children),
    CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => el('div', { className, 'data-card-content': true }, children),
    CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => el('p', { className, 'data-card-description': true }, children),
    CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => el('footer', { className, 'data-card-footer': true }, children),
    CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => el('header', { className, 'data-card-header': true }, children),
    CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => el('h2', { className, 'data-card-title': true }, children),
}))

vi.mock('@/components/ui/button', async () => ({
    Button: ({ children, className, disabled, type, variant }: { children: React.ReactNode; className?: string; disabled?: boolean; type?: string; variant?: string }) =>
        el('button', { className, disabled: disabled || undefined, type, 'data-variant': variant }, children),
}))

function mockFieldComponent(slot: string) {
    return ({ field, disabled }: { field: FieldConfig; disabled?: boolean }) =>
        el('div', { 'data-field-slot': slot, 'data-field-name': field.name, 'data-disabled': disabled ? 'true' : 'false' }, field.label)
}

vi.mock('@/components/crud/fields/TextField', async () => ({ TextField: mockFieldComponent('text') }))
vi.mock('@/components/crud/fields/NumberField', async () => ({ NumberField: mockFieldComponent('number') }))
vi.mock('@/components/crud/fields/SelectField', async () => ({ SelectField: mockFieldComponent('select') }))
vi.mock('@/components/crud/fields/BooleanField', async () => ({ BooleanField: mockFieldComponent('boolean') }))
vi.mock('@/components/crud/fields/DateTimeField', async () => ({ DateTimeField: mockFieldComponent('datetime') }))
vi.mock('@/components/crud/fields/FileField', async () => ({ FileField: mockFieldComponent('file') }))
vi.mock('@/components/crud/fields/TagsField', async () => ({ TagsField: mockFieldComponent('tags') }))
vi.mock('@/components/crud/fields/JsonField', async () => ({ JsonField: mockFieldComponent('json') }))
vi.mock('@/components/crud/fields/MultiSelectField', async () => ({ MultiSelectField: mockFieldComponent('multiselect') }))
vi.mock('@/components/crud/fields/CustomField', async () => ({ CustomField: mockFieldComponent('custom') }))

import { GenericForm } from '@/components/crud/GenericForm'

describe('GenericForm snapshots', () => {
    const fields: FieldConfig[] = [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'strength', label: 'Strength', type: 'number', required: true },
        { name: 'secret', label: 'Secret', type: 'text', hidden: true },
    ]

    it('renders the happy path form structure', () => {
        const markup = renderToStaticMarkup(React.createElement(GenericForm, {
            fields,
            title: 'Cocktail form',
            description: 'Keep this recipe tidy.',
            defaultValues: { name: 'Martini', strength: 5, secret: 'hidden' },
            onSubmit: vi.fn(),
            onCancel: vi.fn(),
            submitButtonLabel: 'Save recipe',
        }))

        expect(markup).toMatchInlineSnapshot(`"<section class="bg-canvas border-line shadow-sm" data-card="true"><header class="border-b border-line pb-5" data-card-header="true"><h2 class="font-headline text-fg text-lg" data-card-title="true">Cocktail form</h2><p class="text-fg-muted font-body text-sm" data-card-description="true">Keep this recipe tidy.</p></header><div data-form="true"><form><div class="space-y-6 pt-6" data-card-content="true"><div><div data-field-slot="text" data-field-name="name" data-disabled="false">Name</div></div><div><div data-field-slot="number" data-field-name="strength" data-disabled="false">Strength</div></div></div><footer class="flex justify-between gap-3 mt-2 border-t border-line bg-canvas pt-5 rounded-b-xl" data-card-footer="true"><button class="flex-1 rounded-full text-xs font-label uppercase tracking-widest text-fg-secondary border-line bg-line/60 hover:bg-line hover:text-fg transition-colors" type="button" data-variant="outline">Cancel</button><button class="flex-1 rounded-full text-xs font-label uppercase tracking-widest bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 border-0" type="submit">Save recipe</button></footer></form></div></section>"`)
        expect(markup).not.toContain('Secret')
    })

    it('renders the disabled/loading path', () => {
        const markup = renderToStaticMarkup(React.createElement(GenericForm, {
            fields,
            onSubmit: vi.fn(),
            isLoading: true,
        }))

        expect(markup).toMatchInlineSnapshot(`"<section class="bg-canvas border-line shadow-sm" data-card="true"><div data-form="true"><form><div class="space-y-6 pt-6" data-card-content="true"><div><div data-field-slot="text" data-field-name="name" data-disabled="true">Name</div></div><div><div data-field-slot="number" data-field-name="strength" data-disabled="true">Strength</div></div></div><footer class="flex justify-between gap-3 mt-2 border-t border-line bg-canvas pt-5 rounded-b-xl" data-card-footer="true"><button class="ml-auto rounded-full text-xs font-label uppercase tracking-widest bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 border-0" disabled="" type="submit">Save</button></footer></form></div></section>"`)
    })
})
