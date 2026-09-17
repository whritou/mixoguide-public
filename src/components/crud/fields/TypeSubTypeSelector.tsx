'use client'
import { useState, useTransition } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import clsx from 'clsx'
import {
    Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command, CommandEmpty, CommandGroup,
    CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import {useIngredientSubTypesQuery} from "@/hooks/queries/use-ingredient-subtypes";
import {useIngredientTypesQuery} from "@/hooks/queries/use-ingredient-types";

export interface TypeSubTypeValue {
    typeId   : string
    subTypeId: string
}

interface Props {
    value    : TypeSubTypeValue
    onChange : (v: TypeSubTypeValue) => void
    disabled?: boolean
}

const triggerCls = `
    w-full flex items-center justify-between px-4 py-2 rounded-xl bg-white
    border border-mg-sand text-sm font-body text-left
    focus:outline-none focus:ring-1 focus:ring-mg-caramel/40
    hover:border-mg-caramel/50 transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed
`.trim()

export function TypeSubTypeSelector({ value, onChange, disabled }: Props) {

    /* ── Type search ─────────────────────────────────────────────── */
    const [typeOpen, setTypeOpen]               = useState(false)
    const [deferredTypeSearch, setDeferredType] = useState('')
    const [, startTypeT]                        = useTransition()

    const handleTypeSearch = (v: string) =>
        startTypeT(() => setDeferredType(v))

    const { data: typeData } = useIngredientTypesQuery({
        search: deferredTypeSearch || undefined,
        limit: 200,
    })

    const ingredientTypes = typeData?.items ?? []

    const selectedType = ingredientTypes.find(t => t.id === value.typeId)
        ?? (value.typeId ? { id: value.typeId, name: '…' } : null)

    const selectType = (typeId: string) => {
        onChange({ typeId, subTypeId: '' })
        setTypeOpen(false)
    }

    /* ── Sub-type search ─────────────────────────────────────────── */
    const [subOpen, setSubOpen]                 = useState(false)
    const [deferredSubSearch, setDeferredSub]   = useState('')
    const [, startSubT]                         = useTransition()

    const handleSubSearch = (v: string) =>
        startSubT(() => setDeferredSub(v))

    const { data } = useIngredientSubTypesQuery({
        search: deferredSubSearch || undefined,
        typeId: value.typeId || undefined,
        limit: 200,
    })

    const ingredientSubTypes = (data?.items ?? []).filter(
        (st) => st.typeId === value.typeId
    )

    const selectedSub = ingredientSubTypes.find(st => st.id === value.subTypeId)
        ?? (value.subTypeId ? { id: value.subTypeId, name: '…' } : null)

    const selectSub = (subTypeId: string) => {
        onChange({ ...value, subTypeId })
        setSubOpen(false)
    }

    const clearSub = () => onChange({ ...value, subTypeId: '' })

    /* ── Render ──────────────────────────────────────────────────── */
    return (
        <div className="space-y-4">

            {/* Type */}
            <div>
                <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                    Type <span className="text-mg-caramel">*</span>
                </label>
                <Popover open={typeOpen} onOpenChange={setTypeOpen} modal>
                    <PopoverTrigger asChild>
                        <button type="button" role="combobox" aria-controls="type-listbox" aria-expanded={typeOpen} disabled={disabled} className={triggerCls}>
                            <span className={selectedType ? 'text-mg-ink' : 'text-mg-muted'}>
                                {selectedType ? selectedType.name : 'Select a type…'}
                            </span>
                            <ChevronsUpDown size={14} className="shrink-0 text-mg-muted" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="p-0 rounded-xl border-mg-sand"
                        style={{ width: 'var(--radix-popover-trigger-width)' }}
                        align="start"
                    >
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Search type…"
                                onValueChange={handleTypeSearch}
                                className="text-sm font-body"
                            />
                            <CommandList id="type-listbox" className="max-h-60">
                                <CommandEmpty className="py-4 text-center text-sm font-body text-mg-muted">
                                    No type found.
                                </CommandEmpty>
                                <CommandGroup>
                                    {ingredientTypes.map(t => (
                                        <CommandItem
                                            key={t.id}
                                            value={t.id}
                                            onSelect={() => selectType(t.id)}
                                            className="flex items-center gap-2 cursor-pointer text-sm font-body text-mg-ink hover:bg-mg-caramel/8"
                                        >
                                            <span className="flex-1">{t.name}</span>
                                            <Check
                                                size={14}
                                                className={clsx('shrink-0 text-mg-caramel', value.typeId === t.id ? 'opacity-100' : 'opacity-0')}
                                            />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Sub-type — only visible once a type is chosen */}
            {value.typeId && (
                <div>
                    <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                        Sub-type{' '}
                        <span className="normal-case font-body tracking-normal text-mg-muted/60">(optional)</span>
                    </label>
                    <div className="flex gap-2">
                        <Popover open={subOpen} onOpenChange={setSubOpen} modal>
                            <PopoverTrigger asChild>
                                <button type="button" role="combobox" aria-controls="subtype-listbox" aria-expanded={subOpen} disabled={disabled} className={`flex-1 ${triggerCls}`}>
                                    <span className={selectedSub ? 'text-mg-ink' : 'text-mg-muted'}>
                                        {selectedSub ? selectedSub.name : 'Select a sub-type…'}
                                    </span>
                                    <ChevronsUpDown size={14} className="shrink-0 text-mg-muted" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="p-0 rounded-xl border-mg-sand"
                                style={{ width: 'var(--radix-popover-trigger-width)' }}
                                align="start"
                            >
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Search sub-type…"
                                        onValueChange={handleSubSearch}
                                        className="text-sm font-body"
                                    />
                                    <CommandList id="subtype-listbox" className="max-h-60">
                                        <CommandEmpty className="py-4 text-center text-sm font-body text-mg-muted">
                                            {ingredientSubTypes.length === 0 && !deferredSubSearch
                                                ? 'No sub-types for this type.'
                                                : 'No sub-type found.'}
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {ingredientSubTypes.map(st => (
                                                <CommandItem
                                                    key={st.id}
                                                    value={st.id}
                                                    onSelect={() => selectSub(st.id)}
                                                    className="flex items-center gap-2 cursor-pointer text-sm font-body text-mg-ink hover:bg-mg-caramel/8"
                                                >
                                                    <span className="flex-1">{st.name}</span>
                                                    <Check
                                                        size={14}
                                                        className={clsx('shrink-0 text-mg-caramel', value.subTypeId === st.id ? 'opacity-100' : 'opacity-0')}
                                                    />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {value.subTypeId && (
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={clearSub}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-mg-sand text-mg-muted hover:bg-mg-sand hover:text-mg-charcoal transition-colors disabled:opacity-40"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
