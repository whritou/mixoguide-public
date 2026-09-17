// Shared query parameter helpers for API route handlers.

/**
 * Extract a CSV filter value from a filters object, remove it from the object,
 * and return the split array. Mutates the input filters object.
 *
 * @example
 * const filters = { ingredients: 'vodka,gin', difficulty: 'easy' }
 * extractCsv(filters, 'ingredients') // ['vodka', 'gin']
 * // filters is now { difficulty: 'easy' }
 */
export function extractCsv(filters: Record<string, unknown>, key: string): string[] {
    const value = filters[key]
    delete filters[key]
    if (!value || typeof value !== 'string') return []
    return value.split(',').map((v) => v.trim()).filter(Boolean)
}

/**
 * Build a Prisma relation filter (extraWhere) from named CSV query params.
 * Removes consumed filter keys from the params.filters object.
 *
 * @example
 * const config = {
 *   ingredients: (names) => ({ ingredients: { some: { ingredient: { name: { in: names } } } } }),
 * }
 * buildRelationFilters(params, config)
 */
export function buildRelationFilters(
    filters: Record<string, unknown>,
    config: Record<string, (names: string[]) => Record<string, unknown>>,
): Record<string, unknown> {
    const extraWhere: Record<string, unknown> = {}

    for (const [key, buildWhere] of Object.entries(config)) {
        const names = extractCsv(filters, key)
        if (names.length) {
            Object.assign(extraWhere, buildWhere(names))
        }
    }

    return extraWhere
}
