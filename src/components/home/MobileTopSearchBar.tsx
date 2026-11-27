'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

type MobileTopSearchBarProps = {
    placeholder?: string
    targetPath?: string
}

export function MobileTopSearchBar({
    placeholder = 'Search cocktails...',
    targetPath = '/cocktails',
}: MobileTopSearchBarProps) {
    const router = useRouter()
    const [query, setQuery] = useState('')

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const next = new URLSearchParams()
        const trimmed = query.trim()
        if (trimmed) {
            next.set('search', trimmed)
        }

        const queryString = next.toString()
        router.push(queryString ? `${targetPath}?${queryString}` : targetPath)
    }

    return (
        <div className="md:hidden sticky top-0 z-[100] bg-canvas/95 backdrop-blur-md border-b border-line">
            <form onSubmit={submit} className="px-4 py-3" role="search">
                <div className="relative">
                    <Search size={13} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                    <input
                        type="search"
                        aria-label={placeholder.replace(/\.+$|…$/, '')}
                        placeholder={placeholder}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="pl-8 pr-7 py-2 w-full rounded-full bg-line/50 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring border border-line-control"
                    />
                    {query && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => setQuery('')}
                            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-h-6 min-w-6 p-1.5 rounded-full text-fg-muted hover:text-fg-secondary"
                        >
                            <X size={13} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}
