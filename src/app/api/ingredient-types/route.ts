import { NextRequest } from 'next/server'
import { ingredientTypeService } from '@/services/ingredient-type.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin, withPublic } from '@/middlewares/withAuth'
import { createIngredientTypeSchema } from '@/validations'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { cacheControl, CACHE_DURATIONS } from '@/utils/cacheHeaders'

export const GET = withPublic(async (req: NextRequest) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await ingredientTypeService.getAll(params)
    return ApiResponse.paginated(result, { 'Cache-Control': cacheControl(CACHE_DURATIONS.STATIC) })
})

export const POST = withAdmin(async (req) => {
    const body = await req.json()
    const data = createIngredientTypeSchema.parse(body)
    const type = await ingredientTypeService.create(data)
    return ApiResponse.created(type)
}, { rateLimit: 'public-read' })
