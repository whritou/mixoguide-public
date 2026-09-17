import { NextRequest } from 'next/server'
import { glassService } from '@/services/glass.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin, withPublic } from '@/middlewares/withAuth'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { cacheControl, CACHE_DURATIONS } from '@/utils/cacheHeaders'
import { createGlassSchema } from '@/validations'

export const GET = withPublic(async (req: NextRequest) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await glassService.getAll(params)
    return ApiResponse.paginated(result, { 'Cache-Control': cacheControl(CACHE_DURATIONS.STATIC) })
})

export const POST = withAdmin(async (req) => {
    const body = await req.json()
    const data = createGlassSchema.parse(body)
    const ingredient = await glassService.create(data)
    return ApiResponse.created(ingredient)
}, { rateLimit: 'public-read' })
