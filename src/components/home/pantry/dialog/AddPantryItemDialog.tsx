'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { usePantryMutations } from '@/hooks/mutations/use-pantry-mutations'
import { useIngredientsQuery } from '@/hooks/queries/use-ingredients'
import { resolveIngredientUnitFallback } from '@/utils/ingredientUnitFallback'

type IngredientOpt = {
    id: string
    name: string
    isAlcoholic: boolean | null
    typeName?: string
    subTypeName?: string
    defaultUnit?: string
}

const UNITS = ['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'] as const

const SWITCHES = [
    { key: 'favorite', label: 'Favourite', sub: 'Show this in your favourites' },
    { key: 'isEssential', label: 'Essential', sub: 'A pantry staple you always keep' },
    { key: 'isInfinite', label: 'Always stocked', sub: 'Water, sugar, syrup… never runs out' },
] as const

type SwitchKey = typeof SWITCHES[number]['key']
type Destination = 'pantry' | 'shopping'

const defaultSwitches: Record<SwitchKey, boolean> = {
    favorite: false,
    isEssential: false,
    isInfinite: false,
}

export default function AddPantryItemDialog({
    open, onOpenChange, onCreated,
}: {
    open: boolean
    onOpenChange: (b: boolean) => void
    onCreated: () => void
}) {
    const pathName = usePathname()
    const { add } = usePantryMutations()
    const { data } = useIngredientsQuery({ limit: 500 })

    const ingredientEntities = data?.items
    const searchInputRef = useRef<HTMLInputElement | null>(null)

    const [comboOpen, setComboOpen] = useState(false)
    const fid = useId()
    const listboxId = `${fid}-ingredients`
    const [search, setSearch] = useState('')
    const [ingredientId, setIngredientId] = useState('')
    const [qty, setQty] = useState('')
    const [unit, setUnit] = useState<string>('pcs')
    const [expiryDate, setExpiryDate] = useState('')
    const [note, setNote] = useState('')
    const [switches, setSwitches] = useState(defaultSwitches)
    const [destination, setDestination] = useState<Destination>('pantry')
    const [submitting, setSubmitting] = useState(false)

    const ingredients: IngredientOpt[] = useMemo(() => {
        if (!ingredientEntities) return []

        return ingredientEntities.map(e => ({
            id: e.id,
            name: e.name,
            isAlcoholic: e.isAlcoholic ?? null,
            typeName: e.type?.name,
            subTypeName: e.subType?.name,
            defaultUnit: e.unit ?? undefined,
        }))
    }, [ingredientEntities])

    const selectedIng = ingredients.find(i => i.id === ingredientId)

    const filteredIngredients = useMemo(() => {
        const q = search.trim().toLowerCase()
        const matches = q
            ? ingredients.filter(ing => ing.name.toLowerCase().includes(q))
            : ingredients.slice(0, 50)

        if (selectedIng && !matches.some(ing => ing.id === selectedIng.id)) {
            return [selectedIng, ...matches.slice(0, 49)]
        }

        return matches
    }, [ingredients, search, selectedIng])

    const setSwitch = (key: SwitchKey, val: boolean) =>
        setSwitches(prev => ({ ...prev, [key]: val }))

    const selectIngredient = (ing: IngredientOpt) => {
        setIngredientId(ing.id)
        setUnit(resolveIngredientUnitFallback({
            defaultUnit: ing.defaultUnit,
            ingredientName: ing.name,
            typeName: ing.typeName,
            subTypeName: ing.subTypeName,
            isAlcoholic: ing.isAlcoholic,
        }))
        setSearch('')
        setComboOpen(false)
    }

    const resetForm = () => {
        setComboOpen(false)
        setIngredientId('')
        setSearch('')
        setQty('')
        setUnit('pcs')
        setExpiryDate('')
        setNote('')
        setSwitches(defaultSwitches)
        setDestination('pantry')
    }

    useEffect(() => {
        if (!ingredientEntities?.length) return

        const pathParts = pathName.split('/')
        const maybeId = pathParts[pathParts.length - 1]
        const exists = ingredientEntities.find(i => i.id === maybeId)

        if (exists) {
            setIngredientId(maybeId)
        }
    }, [pathName, ingredientEntities])

    useEffect(() => {
        if (!ingredientId) return

        const ing = ingredients.find(i => i.id === ingredientId)
        if (ing) {
            setUnit(resolveIngredientUnitFallback({
                defaultUnit: ing.defaultUnit,
                ingredientName: ing.name,
                typeName: ing.typeName,
                subTypeName: ing.subTypeName,
                isAlcoholic: ing.isAlcoholic,
            }))
        }
    }, [ingredientId, ingredients])

    useEffect(() => {
        if (!comboOpen) return
        const id = window.setTimeout(() => searchInputRef.current?.focus(), 20)
        return () => window.clearTimeout(id)
    }, [comboOpen])

    const close = () => {
        onOpenChange(false)
        resetForm()
    }

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) resetForm()
        onOpenChange(nextOpen)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ingredientId || (!switches.isInfinite && (!qty || Number(qty) <= 0))) {
            toast.error('Please select an ingredient and enter a valid quantity')
            return
        }

        setSubmitting(true)
        try {
            const result = await add.mutateAsync({
                ingredientId,
                quantity: switches.isInfinite ? 0 : Number(qty),
                unitLeft: unit,
                favorite: switches.favorite,
                isEssential: switches.isEssential,
                isInfinite: switches.isInfinite,
                isInPantry: destination === 'pantry',
                isInShoppingList: destination === 'shopping',
                expirationDate: expiryDate ? new Date(expiryDate).toISOString() : null,
                note: note.trim() || null,
            })
            if (!result) throw new Error()
            toast.success(`${selectedIng?.name ?? 'Item'} added to pantry`)
            onCreated()
            close()
        } catch {
            toast.error('Error while adding item')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton={false}
                aria-describedby={undefined}
                className="w-full max-w-lg sm:max-w-lg bg-canvas rounded-2xl shadow-2xl flex flex-col max-h-[90vh] p-0 border-0 gap-0 overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-line">
                    <DialogTitle className="font-headline text-xl font-normal leading-normal text-fg">Add to pantry</DialogTitle>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close add to pantry dialog"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-line transition-colors"
                    >
                        <X size={16} className="text-fg-muted" aria-hidden="true" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
                    <div className="px-6 py-5 space-y-5">
                        <div>
                            <span id={`${fid}-ing-label`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                Ingredient <span aria-hidden="true">*</span><span className="sr-only">(required)</span>
                            </span>
                            <div className="space-y-2">
                                {!comboOpen ? (
                                    <button
                                        type="button"
                                        aria-expanded={comboOpen}
                                        aria-labelledby={`${fid}-ing-label ${fid}-ing-value`}
                                        onClick={() => setComboOpen(true)}
                                        className="flex w-full items-center justify-between rounded-xl border border-line-control bg-surface px-4 py-2.5 text-left text-sm font-body text-fg transition-colors hover:border-brand-soft focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        {selectedIng ? (
                                            <span id={`${fid}-ing-value`} className="flex items-center gap-2">
                                                {selectedIng.name}
                                                {selectedIng.isAlcoholic && (
                                                    <span className="rounded-full bg-brand-soft/15 px-1.5 py-0.5 text-[10px] font-label uppercase tracking-wider text-brand">
                                                        alcohol
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <span id={`${fid}-ing-value`} className="text-fg-muted">Search ingredient...</span>
                                        )}
                                        <ChevronsUpDown size={14} aria-hidden="true" className="shrink-0 text-fg-muted" />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 rounded-xl border border-line-control bg-surface px-4 focus-within:ring-1 focus-within:ring-ring">
                                        <Search size={14} aria-hidden="true" className="shrink-0 text-fg-muted pointer-events-none" />
                                        <input
                                            ref={searchInputRef}
                                            type="search"
                                            aria-label="Search ingredients"
                                            aria-controls={listboxId}
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder="Search by name..."
                                            autoComplete="off"
                                            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-body text-fg placeholder:text-fg-muted focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (search) {
                                                    setSearch('')
                                                } else {
                                                    setComboOpen(false)
                                                }
                                            }}
                                            aria-label={search ? 'Clear ingredient search' : 'Close ingredient search'}
                                            className="shrink-0 inline-flex items-center justify-center min-h-6 min-w-6 p-1 rounded-full text-fg-muted hover:text-fg-secondary"
                                        >
                                            <X size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}

                                {comboOpen && (
                                    <div id={listboxId} role="group" aria-label="Ingredient results" className="max-h-56 overflow-y-auto rounded-xl border border-line bg-surface shadow-sm">
                                        {filteredIngredients.length > 0 ? (
                                            filteredIngredients.map(ing => (
                                                <button
                                                    key={ing.id}
                                                    type="button"
                                                    aria-pressed={ingredientId === ing.id}
                                                    onClick={() => selectIngredient(ing)}
                                                    className={clsx(
                                                        'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-body transition-colors',
                                                        ingredientId === ing.id
                                                            ? 'bg-brand-soft/10 text-brand'
                                                            : 'text-fg hover:bg-surface-hover-alt',
                                                    )}
                                                >
                                                    <span className="flex-1">{ing.name}</span>
                                                    {ing.isAlcoholic && (
                                                        <span className="rounded-full bg-brand-soft/15 px-1.5 py-0.5 text-[10px] font-label uppercase tracking-wider text-brand">
                                                            alc
                                                        </span>
                                                    )}
                                                    <Check
                                                        size={14}
                                                        aria-hidden="true"
                                                        className={clsx(
                                                            'shrink-0 text-brand-soft-strong',
                                                            ingredientId === ing.id ? 'opacity-100' : 'opacity-0'
                                                        )}
                                                    />
                                                </button>
                                            ))
                                        ) : (
                                            <p className="px-3 py-4 text-center text-sm text-fg-muted">No ingredient found.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                            <div className="col-span-3">
                                <label htmlFor={`${fid}-qty`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                    Quantity
                                </label>
                                <input
                                    id={`${fid}-qty`}
                                    type="number"
                                    value={qty}
                                    onChange={e => setQty(e.target.value)}
                                    min="0"
                                    step="0.1"
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <div className="col-span-2">
                                <label htmlFor={`${fid}-unit`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                    Unit
                                </label>
                                <select
                                    id={`${fid}-unit`}
                                    value={unit}
                                    onChange={e => setUnit(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor={`${fid}-expiry`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                Expiration date
                                <span className="ml-1 text-fg-muted normal-case font-body tracking-normal">(optional)</span>
                            </label>
                            <input
                                id={`${fid}-expiry`}
                                type="date"
                                value={expiryDate}
                                onChange={e => setExpiryDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>

                        <div>
                            <span id={`${fid}-dest`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                Add to
                            </span>
                            <div role="group" aria-labelledby={`${fid}-dest`} className="flex rounded-xl border border-line overflow-hidden">
                                {([
                                    { value: 'pantry' as Destination, label: 'Pantry', sub: 'Available in your bar' },
                                    { value: 'shopping' as Destination, label: 'Shopping list', sub: 'Buy it later' },
                                ] as const).map(({ value, label, sub }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={destination === value}
                                        onClick={() => setDestination(value)}
                                        className={clsx(
                                            'flex-1 px-4 py-3 text-left transition-colors',
                                            destination === value
                                                ? 'bg-gradient-to-br from-brand-gradient-from/10 to-brand-gradient-to/10 border-brand-soft'
                                                : 'bg-surface hover:bg-surface-hover',
                                            value === 'pantry' && 'border-r border-line',
                                        )}
                                    >
                                        <p className={clsx(
                                            'text-sm font-body leading-none mb-0.5',
                                            destination === value ? 'text-brand font-medium' : 'text-fg',
                                        )}>{label}</p>
                                        <p className="text-xs text-fg-muted">{sub}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-line overflow-hidden divide-y divide-line">
                            {SWITCHES.map(({ key, label, sub }) => (
                                <div key={key} className="flex items-center justify-between px-4 py-3 bg-surface">
                                    <div>
                                        <p id={`${fid}-${key}-label`} className="text-sm font-body text-fg leading-none mb-0.5">{label}</p>
                                        <p id={`${fid}-${key}-desc`} className="text-xs text-fg-muted">{sub}</p>
                                    </div>
                                    <Switch
                                        aria-labelledby={`${fid}-${key}-label`}
                                        aria-describedby={`${fid}-${key}-desc`}
                                        checked={switches[key]}
                                        onCheckedChange={v => setSwitch(key, v)}
                                    />
                                </div>
                            ))}
                        </div>

                        <div>
                            <label htmlFor={`${fid}-note`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                Note
                                <span className="ml-1 text-fg-muted normal-case font-body tracking-normal">(optional)</span>
                            </label>
                            <textarea
                                id={`${fid}-note`}
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="e.g. Premium brand, opened Jan 2025, low stock..."
                                rows={2}
                                maxLength={500}
                                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                            {note.length > 400 && (
                                <p className="text-xs text-fg-muted text-right mt-1">{note.length}/500</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 px-6 py-4 border-t border-line bg-canvas">
                        <button
                            type="button"
                            onClick={close}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-line text-fg-secondary hover:bg-line transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !ingredientId || (!switches.isInfinite && (!qty || Number(qty) <= 0))}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {submitting ? 'Adding...' : 'Add to pantry'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
