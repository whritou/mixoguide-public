import { NextRequest } from 'next/server'
import { cocktailService } from '@/services/cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { clampMaxMissing } from '@/lib/cache/makeable-cache'

export const GET = withUser(async (req: NextRequest, _ctx, session) => {
    // Integer 0..10 (DB-010): NaN / negatives / fractions never reach the cache key.
    const maxMissing = clampMaxMissing(req.nextUrl.searchParams.get('maxMissing'))
    const cocktails = await cocktailService.getBestMakeable(session.user.id, maxMissing)
    return ApiResponse.success(cocktails)
}, { rateLimit: 'makeable' })
