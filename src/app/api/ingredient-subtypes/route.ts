import { NextRequest } from 'next/server'
import { ingredientSubTypeService } from '@/services/ingredient-subtype.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin, withPublic } from '@/middlewares/withAuth'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { cacheControl, CACHE_DURATIONS } from '@/utils/cacheHeaders'
import { createIngredientSubTypeSchema } from '@/validations'

export const GET = withPublic(async (req: NextRequest) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await ingredientSubTypeService.getAll(params)
    return ApiResponse.paginated(result, { 'Cache-Control': cacheControl(CACHE_DURATIONS.STATIC) })
})

export const POST = withAdmin(async (req) => {
    const body = await req.json()
    const data = createIngredientSubTypeSchema.parse(body)
    const subType = await ingredientSubTypeService.create(data)
    return ApiResponse.created(subType)
}, { rateLimit: 'admin-write' })
