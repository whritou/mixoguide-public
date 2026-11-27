export interface OffsetPage<T> {
    items: T[]
    meta: { total?: number }
}

/**
 * `getNextPageParam` for offset pagination: the next offset is the number of
 * items loaded so far, until `meta.total` is reached (or a page comes back empty).
 */
export function nextOffset<T>(lastPage: OffsetPage<T>, allPages: OffsetPage<T>[]): number | undefined {
    if (lastPage.items.length === 0) return undefined
    const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0)
    const total = lastPage.meta?.total
    if (typeof total === 'number') return loaded < total ? loaded : undefined
    return undefined
}

/** Flattens pages, dropping duplicates that can appear when rows shift between page fetches. */
export function flattenUnique<T extends { id: string }>(pages: OffsetPage<T>[] | undefined): T[] {
    if (!pages) return []
    const seen = new Set<string>()
    const out: T[] = []
    for (const page of pages) {
        for (const item of page.items) {
            if (seen.has(item.id)) continue
            seen.add(item.id)
            out.push(item)
        }
    }
    return out
}
