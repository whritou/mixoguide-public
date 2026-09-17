import { NextRequest } from 'next/server'
import { cocktailService } from '@/services/cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin, withPublic } from '@/middlewares/withAuth'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { createCocktailSchema } from '@/validations'
import { buildRelationFilters, extractCsv } from '@/utils/queryHelpers'
import { cacheControl, CACHE_DURATIONS } from '@/utils/cacheHeaders'

/** Relation filter config: maps query param names to Prisma relation queries */
const COCKTAIL_RELATION_FILTERS = {
    ingredients: (names: string[]) => ({ ingredients: { some: { ingredient: { name: { in: names } } } } }),
}

export const GET = withPublic(async (req: NextRequest) => {
    const params = parseQueryParams(req.nextUrl.searchParams)

    const extraWhere: Record<string, unknown> = {}

    if (params.filters) {
        Object.assign(extraWhere, buildRelationFilters(params.filters, COCKTAIL_RELATION_FILTERS))

        // ID allow-list filters — each sends a CSV of cocktail IDs (or '__none__' sentinel for empty set).
        // When multiple are active, apply the intersection so all constraints are respected.
        const favoriteIds  = extractCsv(params.filters, 'favoriteIds')
        const makeableIds  = extractCsv(params.filters, 'makeableIds')

        if (favoriteIds.length > 0 || makeableIds.length > 0) {
            let allowed: string[] | null = favoriteIds.length > 0 ? favoriteIds : null
            if (makeableIds.length > 0) {
                allowed = allowed
                    ? allowed.filter(id => makeableIds.includes(id))
                    : makeableIds
            }
            extraWhere.id = { in: allowed ?? [] }
        }
    }

    if (Object.keys(extraWhere).length) {
        params.extraWhere = extraWhere
    }

    const result = await cocktailService.getAll(params)
    return ApiResponse.paginated(result, { 'Cache-Control': cacheControl(CACHE_DURATIONS.SHORT) })
}, { rateLimit: 'public-read' })

export const POST = withAdmin(async (req) => {
    const body = await req.json()
    const data = createCocktailSchema.parse(body)
    const cocktail = await cocktailService.create(data)
    return ApiResponse.created(cocktail)
})
