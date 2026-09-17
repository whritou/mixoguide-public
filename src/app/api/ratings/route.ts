import { NextRequest } from 'next/server'
import { ratingService } from '@/services/rating.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withPublic } from '@/middlewares/withAuth'
import { parseQueryParams } from '@/utils/parseQueryParams'

export const GET = withPublic(async (req: NextRequest) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await ratingService.getAll(params)
    return ApiResponse.paginated(result)
}, { rateLimit: 'public-read' })
