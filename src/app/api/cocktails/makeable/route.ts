import { NextRequest } from 'next/server'
import { cocktailService } from '@/services/cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { clampMaxMissing } from '@/lib/cache/makeable-cache'

export const GET = withUser(async (req: NextRequest, _ctx, session) => {
    const maxMissing = clampMaxMissing(req.nextUrl.searchParams.get('maxMissing') ?? 3, 3)
    const cocktails = await cocktailService.getMakeable(session.user.id, maxMissing)
    return ApiResponse.success(cocktails)
}, { rateLimit: 'makeable' })
