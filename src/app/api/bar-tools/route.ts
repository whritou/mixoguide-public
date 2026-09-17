import { NextRequest } from 'next/server'
import { barToolService } from '@/services/bartool.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin, withPublic } from '@/middlewares/withAuth'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { cacheControl, CACHE_DURATIONS } from '@/utils/cacheHeaders'
import { createBarToolSchema } from '@/validations'

export const GET = withPublic(async (req: NextRequest) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await barToolService.getAll(params)
    return ApiResponse.paginated(result, { 'Cache-Control': cacheControl(CACHE_DURATIONS.STATIC) })
})

export const POST = withAdmin(async (req) => {
    const body = await req.json()
    const data = createBarToolSchema.parse(body)
    const barTool = await barToolService.create(data)
    return ApiResponse.created(barTool)
}, { rateLimit: 'public-read' })
