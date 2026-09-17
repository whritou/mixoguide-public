'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
            <DialogContent className="w-full max-w-lg bg-mg-cream rounded-2xl shadow-2xl flex flex-col max-h-[90vh] p-0 border-0 gap-0 overflow-hidden [&>button]:hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-mg-sand">
                    <DialogTitle className="font-headline text-xl text-mg-ink">Add to pantry</DialogTitle>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close add to pantry dialog"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-sand transition-colors"
                    >
                        <X size={16} className="text-mg-muted" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
                    <div className="px-6 py-5 space-y-5">
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Ingredient *
                            </label>
                            <div className="space-y-2">
                                {!comboOpen ? (
                                    <button
                                        type="button"
                                        role="combobox"
                                        aria-controls="ingredient-listbox"
                                        aria-expanded={comboOpen}
                                        onClick={() => setComboOpen(true)}
                                        className="flex w-full items-center justify-between rounded-xl border border-mg-sand bg-white px-4 py-2.5 text-left text-sm font-body text-mg-ink transition-colors hover:border-mg-caramel/50 focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                                    >
                                        {selectedIng ? (
                                            <span className="flex items-center gap-2">
                                                {selectedIng.name}
                                                {selectedIng.isAlcoholic && (
                                                    <span className="rounded-full bg-mg-caramel/15 px-1.5 py-0.5 text-[10px] font-label uppercase tracking-wider text-mg-brown">
                                                        alcohol
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-mg-muted">Search ingredient...</span>
                                        )}
                                        <ChevronsUpDown size={14} className="shrink-0 text-mg-muted" />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 rounded-xl border border-mg-sand bg-white px-4 focus-within:ring-1 focus-within:ring-mg-caramel">
                                        <Search size={14} className="shrink-0 text-mg-muted pointer-events-none" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder="Search by name..."
                                            autoComplete="off"
                                            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-body text-mg-ink placeholder:text-mg-muted focus:outline-none"
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
                                            className="shrink-0 text-mg-muted hover:text-mg-charcoal"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {comboOpen && (
                                    <div id="ingredient-listbox" className="max-h-56 overflow-y-auto rounded-xl border border-mg-sand bg-white shadow-sm">
                                        {filteredIngredients.length > 0 ? (
                                            filteredIngredients.map(ing => (
                                                <button
                                                    key={ing.id}
                                                    type="button"
                                                    onClick={() => selectIngredient(ing)}
                                                    className={clsx(
                                                        'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-body transition-colors',
                                                        ingredientId === ing.id
                                                            ? 'bg-mg-caramel/10 text-mg-brown'
                                                            : 'text-mg-ink hover:bg-mg-frost',
                                                    )}
                                                >
                                                    <span className="flex-1">{ing.name}</span>
                                                    {ing.isAlcoholic && (
                                                        <span className="rounded-full bg-mg-caramel/15 px-1.5 py-0.5 text-[10px] font-label uppercase tracking-wider text-mg-brown">
                                                            alc
                                                        </span>
                                                    )}
                                                    <Check
                                                        size={14}
                                                        className={clsx(
                                                            'shrink-0 text-mg-caramel',
                                                            ingredientId === ing.id ? 'opacity-100' : 'opacity-0'
                                                        )}
                                                    />
                                                </button>
                                            ))
                                        ) : (
                                            <p className="px-3 py-4 text-center text-sm text-mg-muted">No ingredient found.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                            <div className="col-span-3">
                                <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    value={qty}
                                    onChange={e => setQty(e.target.value)}
                                    min="0"
                                    step="0.1"
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-sand text-sm font-body text-mg-ink placeholder:text-mg-muted focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                    Unit
                                </label>
                                <select
                                    value={unit}
                                    onChange={e => setUnit(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-sand text-sm font-body text-mg-ink focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                                >
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Expiration date
                                <span className="ml-1 text-mg-muted/60 normal-case font-body tracking-normal">(optional)</span>
                            </label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={e => setExpiryDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-sand text-sm font-body text-mg-ink focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Add to
                            </label>
                            <div className="flex rounded-xl border border-mg-sand overflow-hidden">
                                {([
                                    { value: 'pantry' as Destination, label: 'Pantry', sub: 'Available in your bar' },
                                    { value: 'shopping' as Destination, label: 'Shopping list', sub: 'Buy it later' },
                                ] as const).map(({ value, label, sub }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setDestination(value)}
                                        className={clsx(
                                            'flex-1 px-4 py-3 text-left transition-colors',
                                            destination === value
                                                ? 'bg-gradient-to-br from-mg-brown/10 to-mg-caramel/10 border-mg-caramel'
                                                : 'bg-white hover:bg-mg-smoke',
                                            value === 'pantry' && 'border-r border-mg-sand',
                                        )}
                                    >
                                        <p className={clsx(
                                            'text-sm font-body leading-none mb-0.5',
                                            destination === value ? 'text-mg-brown font-medium' : 'text-mg-ink',
                                        )}>{label}</p>
                                        <p className="text-xs text-mg-muted">{sub}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-mg-sand overflow-hidden divide-y divide-mg-sand">
                            {SWITCHES.map(({ key, label, sub }) => (
                                <div key={key} className="flex items-center justify-between px-4 py-3 bg-white">
                                    <div>
                                        <p className="text-sm font-body text-mg-ink leading-none mb-0.5">{label}</p>
                                        <p className="text-xs text-mg-muted">{sub}</p>
                                    </div>
                                    <Switch
                                        checked={switches[key]}
                                        onCheckedChange={v => setSwitch(key, v)}
                                    />
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Note
                                <span className="ml-1 text-mg-muted/60 normal-case font-body tracking-normal">(optional)</span>
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="e.g. Premium brand, opened Jan 2025, low stock..."
                                rows={2}
                                maxLength={500}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-sand text-sm font-body text-mg-ink placeholder:text-mg-muted focus:outline-none focus:ring-1 focus:ring-mg-caramel resize-none"
                            />
                            {note.length > 400 && (
                                <p className="text-xs text-mg-muted text-right mt-1">{note.length}/500</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 px-6 py-4 border-t border-mg-sand bg-mg-cream">
                        <button
                            type="button"
                            onClick={close}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-mg-sand/60 text-mg-charcoal hover:bg-mg-sand transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !ingredientId || (!switches.isInfinite && (!qty || Number(qty) <= 0))}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-gradient-to-br from-mg-brown to-mg-caramel text-white hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {submitting ? 'Adding...' : 'Add to pantry'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
