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
        <div className="md:hidden sticky top-0 z-[100] bg-mg-cream/95 backdrop-blur-md border-b border-mg-sand">
            <form onSubmit={submit} className="px-4 py-3">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mg-muted" />
                    <input
                        placeholder={placeholder}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="pl-8 pr-7 py-2 w-full rounded-full bg-mg-sand/50 text-sm text-mg-ink placeholder:text-mg-muted focus:outline-none focus:ring-1 focus:ring-mg-caramel border-none"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mg-muted hover:text-mg-charcoal"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}
