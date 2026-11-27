'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { X, Plus, Search, Minus, Check, Clock, MapPin, MessageSquare, ChevronDown } from 'lucide-react'
import { COCKTAIL_OCCASIONS } from '@/types/models/cocktail'
import {useCocktailsQuery} from "@/hooks/queries/use-cocktails";
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface CocktailOption {
    id:   string
    name: string
}

interface Props {
    onClose:          () => void
    onCreated:        () => void
    initialDate?:     string
    initialTitle?:    string
    initialOccasions?: string[]
    initialServings?: number
    /** Cocktails pre-loaded into the picker (used by Smart Collections). */
    initialCocktails?: CocktailOption[]
}

const formatLabel = (str: string) =>
    str
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

const sortByName = <T extends { name: string }>(arr: T[]) =>
    [...arr].sort((a, b) => formatLabel(a.name).localeCompare(formatLabel(b.name)))

const formatDateInput = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
}

export default function CreatePlannedCollectionDialog({
    onClose,
    onCreated,
    initialDate,
    initialTitle,
    initialOccasions,
    initialServings,
    initialCocktails,
}: Props) {
    const [title,         setTitle]         = useState(initialTitle ?? '')
    const [location,      setLocation]      = useState('')
    const [guestNote,     setGuestNote]     = useState('')
    const [plannedFor,    setPlannedFor]    = useState(initialDate ?? '')
    const [plannedTime,   setPlannedTime]   = useState('')
    const [servings,      setServings]      = useState(initialServings ?? 1)
    const [occasions,     setOccasions]     = useState<string[]>(initialOccasions ?? [])
    const [cocktails,     setCocktails]     = useState<CocktailOption[]>(initialCocktails ?? [])
    const [cocktailSearch,   setCocktailSearch]   = useState('')
    const [debouncedSearch,  setDebouncedSearch]  = useState('')
    const [searchFocused,    setSearchFocused]    = useState(false)
    const [submitting,       setSubmitting]       = useState(false)
    const [showOccasions,    setShowOccasions]    = useState(false)
    const [occasionSearch,   setOccasionSearch]   = useState('')

    /* ── Cocktail search via store ───────────────────────── */

    const todayDate = useMemo(() => formatDateInput(new Date()), [])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(cocktailSearch.trim())
        }, 250)
        return () => window.clearTimeout(timer)
    }, [cocktailSearch])

    const searchParams = useMemo(
        () => debouncedSearch ? { search: debouncedSearch, limit: 20 } : { limit: 20 },
        [debouncedSearch],
    )

    const { data, isLoading: searching } = useCocktailsQuery(searchParams)
    const searchPending = cocktailSearch.trim() !== debouncedSearch

    const searchResults = useMemo(() => {
        const hits = data?.items ?? []
        return hits.filter(
            c => !cocktails.some(x => x.id === c.id)
        )
    }, [data, cocktails])

    const showDropdown = searchFocused && searchResults.length > 0

    const sortedOccasions = useMemo(
        () => sortByName(COCKTAIL_OCCASIONS.map(o => ({ name: o }))),
        [],
    )
    const filteredOccasions = useMemo(() => {
        const q = occasionSearch.trim().toLowerCase()
        return q ? sortedOccasions.filter(o => formatLabel(o.name).toLowerCase().includes(q)) : sortedOccasions
    }, [sortedOccasions, occasionSearch])

    /* ── Handlers ────────────────────────────────────────── */

    const addCocktail = (c: CocktailOption) => {
        setCocktails(prev => [...prev, c])
        setCocktailSearch('')
    }

    const removeCocktail = (id: string) => {
        setCocktails(prev => prev.filter(c => c.id !== id))
    }

    const toggleOccasion = (occ: string) => {
        setOccasions(prev =>
            prev.includes(occ) ? prev.filter(o => o !== occ) : [...prev, occ]
        )
    }

    /* ── Submit ──────────────────────────────────────────── */

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) { toast.error('Title is required'); return }
        if (!plannedFor)   { toast.error('Date is required');  return }
        if (plannedFor < todayDate) { toast.error('Date cannot be in the past'); return }

        const plannedDateTime = `${plannedFor}T${plannedTime || '12:00'}:00`

        setSubmitting(true)
        try {
            const res = await fetch('/api/planned-collections', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    title:       title.trim(),
                    location:    location.trim() || null,
                    guestNote:   guestNote.trim() || null,
                    plannedFor:  new Date(plannedDateTime).toISOString(),
                    servings,
                    occasions,
                    cocktailIds: cocktails.map(c => c.id),
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.message ?? 'Could not create event')
            }
            toast.success(`"${title.trim()}" created!`)
            onCreated()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not create event')
        } finally {
            setSubmitting(false)
        }
    }

    /* ── UI ──────────────────────────────────────────────── */

    return (
        <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
            <DialogContent className="w-full bg-canvas shadow-2xl flex flex-col p-0 border-0 gap-0 overflow-hidden [&>button]:hidden rounded-t-2xl rounded-b-none top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 max-h-[95vh] md:max-h-[85vh] max-w-full sm:rounded-2xl sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-h-[90vh] sm:max-w-lg">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-line">
                    <DialogTitle className="font-headline text-xl text-fg">New Event</DialogTitle>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close new event dialog"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-line transition-colors"
                    >
                        <X size={16} className="text-fg-muted" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
                    <div className="px-6 py-5 space-y-5">

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                Event name *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Tom's Birthday"
                                maxLength={200}
                                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg
                                           placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                      {/* Cocktail search */}
                      <div>
                        <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                          Cocktails
                        </label>

                        {/* Added cocktails as badges */}
                        {cocktails.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {cocktails.map(c => (
                              <span
                                key={c.id}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-body rounded-full
                                                       bg-brand-soft/15 text-brand"
                              >
                                            {c.name}
                                <button
                                  type="button"
                                  onClick={() => removeCocktail(c.id)}
                                  aria-label={`Remove ${c.name}`}
                                  className="ml-0.5 hover:text-danger transition-colors"
                                >
                                                <X size={10} />
                                            </button>
                                        </span>
                            ))}
                          </div>
                        )}

                        {/* Search input */}
                        <div className="relative">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                          <input
                            type="text"
                            value={cocktailSearch}
                            onChange={e => setCocktailSearch(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            placeholder="Search cocktails to add…"
                            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg
                                               placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>

                        {/* Search results dropdown */}
                        {showDropdown && (
                          <div className="mt-1 bg-surface border border-line-strong rounded-xl shadow-md overflow-hidden">
                            {searchResults.slice(0, 20).map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => addCocktail(c)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body text-fg
                                                       hover:bg-brand-soft/10 transition-colors text-left"
                              >
                                <Plus size={12} className="text-brand shrink-0" />
                                {c.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {(searching || searchPending) && searchFocused && (
                          <p className="mt-1 text-xs text-fg-muted">Searching…</p>
                        )}
                      </div>
                        {/* Location */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                Location
                            </label>
                            <div className="relative">
                                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    placeholder="e.g. Home bar"
                                    maxLength={200}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg
                                               placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        </div>

                        {/* Date + time + servings */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={plannedFor}
                                    onChange={e => setPlannedFor(e.target.value)}
                                    min={todayDate}
                                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg
                                               focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                    Time
                                </label>
                                <div className="relative">
                                    <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                                    <input
                                        type="time"
                                        value={plannedTime}
                                        onChange={e => setPlannedTime(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg
                                                   focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                    Servings
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setServings(s => Math.max(1, s - 1))}
                                        aria-label="Decrease servings"
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-surface border border-line-strong
                                                   hover:bg-line transition-colors text-fg-secondary"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center font-body text-sm font-medium text-fg">
                                        {servings}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setServings(s => Math.min(500, s + 1))}
                                        aria-label="Increase servings"
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-surface border border-line-strong
                                                   hover:bg-line transition-colors text-fg-secondary"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                      {/* Occasions */}
                      <div>
                        <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                          Occasions
                        </label>

                        {/* Trigger */}
                        <button
                          type="button"
                          onClick={() => setShowOccasions(o => !o)}
                          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body hover:border-brand-soft transition-colors"
                        >
                                <span className={occasions.length === 0 ? 'text-fg-muted' : 'text-fg'}>
                                    {occasions.length === 0 ? 'Select occasions…' : `${occasions.length} selected`}
                                </span>
                          <ChevronDown size={14} className={`text-fg-muted transition-transform duration-200 ${showOccasions ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Selected chips */}
                        {occasions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {occasions.map(occ => (
                              <span key={occ} className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-label uppercase tracking-widest rounded-full bg-brand text-fg-on-brand">
                                            {formatLabel(occ)}
                                <button type="button" onClick={() => toggleOccasion(occ)} aria-label={`Remove ${formatLabel(occ)}`} className="hover:opacity-70 transition-opacity">
                                                <X size={9} />
                                            </button>
                                        </span>
                            ))}
                          </div>
                        )}

                        {/* Dropdown panel */}
                        {showOccasions && (
                          <div className="mt-1 border border-line-strong rounded-xl bg-surface shadow-md overflow-hidden">
                            <div className="p-2 border-b border-line-strong/50">
                              <input
                                type="text"
                                value={occasionSearch}
                                onChange={e => setOccasionSearch(e.target.value)}
                                placeholder="Filter occasions…"
                                className="w-full px-3 py-1.5 rounded-lg bg-canvas text-xs font-body text-fg placeholder:text-fg-muted focus:outline-none"
                              />
                            </div>
                            <div className="max-h-44 overflow-y-auto">
                              {filteredOccasions.map(({ name: occ }) => {
                                const selected = occasions.includes(occ)
                                return (
                                  <button
                                    key={occ}
                                    type="button"
                                    onClick={() => toggleOccasion(occ)}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-fg hover:bg-brand-soft/10 transition-colors text-left"
                                  >
                                                    <span className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-colors ${selected ? 'bg-brand border-brand' : 'border-line-control'}`}>
                                                        {selected && <Check size={10} className="text-fg-on-brand" />}
                                                    </span>
                                    {formatLabel(occ)}
                                  </button>
                                )
                              })}
                              {filteredOccasions.length === 0 && (
                                <p className="px-4 py-3 text-xs text-fg-muted">No occasions match</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                        {/* Guest note */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                Note for guests
                            </label>
                            <div className="relative">
                                <MessageSquare size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                                <input
                                    type="text"
                                    value={guestNote}
                                    onChange={e => setGuestNote(e.target.value)}
                                    placeholder="e.g. Bring citrus if you have some"
                                    maxLength={280}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm font-body text-fg
                                               placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 px-6 py-4 border-t border-line bg-canvas">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full
                                       bg-line/60 text-fg-secondary hover:bg-line transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !title.trim() || !plannedFor}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full
                                       bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand
                                       hover:scale-[0.98] transition-transform duration-200
                                       disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {submitting ? 'Creating…' : 'Create event'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
