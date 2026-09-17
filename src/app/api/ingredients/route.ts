import { NextRequest } from 'next/server'
import { ingredientService } from '@/services/ingredient.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin, withPublic } from '@/middlewares/withAuth'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { buildRelationFilters } from '@/utils/queryHelpers'
import { cacheControl, CACHE_DURATIONS } from '@/utils/cacheHeaders'
import { createIngredientSchema } from '@/validations'

export const GET = withPublic(async (req: NextRequest) => {
    const params = parseQueryParams(req.nextUrl.searchParams)

    // Handle name-based relation filters from frontend FilterPanel
    if (params.filters) {
        const extraWhere = buildRelationFilters(params.filters, {
            types: (names) => ({ type: { name: { in: names } } }),
            subTypes: (names) => ({ subType: { name: { in: names } } }),
        })
        if (Object.keys(extraWhere).length) {
            params.extraWhere = extraWhere
        }
    }

    const result = await ingredientService.getAll(params)
    return ApiResponse.paginated(result, { 'Cache-Control': cacheControl(CACHE_DURATIONS.SHORT) })
}, { rateLimit: 'public-read' })

export const POST = withAdmin(async (req) => {
    const body = await req.json()
    const data = createIngredientSchema.parse(body)
    const ingredient = await ingredientService.create(data)
    return ApiResponse.created(ingredient)
})
