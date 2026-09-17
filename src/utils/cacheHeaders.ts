/** Cache durations in seconds */
export const CACHE_DURATIONS = {
    /**
     * Admin-managed reference data that almost never changes after seeding:
     * glasses, bar tools, ingredient types, ingredient subtypes.
     * 24h CDN cache with 12h stale-while-revalidate. When an admin edits a
     * row the first user after expiry triggers a revalidation; subsequent
     * users serve fresh until the next expiry.
     */
    STATIC: 86_400,    // 24 hours
    /** Semi-dynamic data (cocktail lists, ingredient lists) */
    SHORT:  60,        // 1 minute
    /** User-specific or frequently changing data */
    NONE:   0,
} as const

/**
 * Build Cache-Control header value.
 * @param maxAge - cache duration in seconds
 * @param isPublic - whether the response can be cached by CDNs
 */
export function cacheControl(maxAge: number, isPublic = true): string {
    if (maxAge <= 0) return 'no-store, no-cache, must-revalidate'
    const scope = isPublic ? 'public' : 'private'
    return `${scope}, max-age=${maxAge}, stale-while-revalidate=${Math.floor(maxAge / 2)}`
}
