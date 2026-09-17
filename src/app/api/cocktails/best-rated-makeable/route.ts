import { NextRequest } from 'next/server'
import { cocktailService } from '@/services/cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const GET = withUser(async (req: NextRequest, _ctx, session) => {
    const maxMissing = Math.min(Number(req.nextUrl.searchParams.get('maxMissing') ?? 3), 10)
    const cocktails = await cocktailService.getBestMakeable(session.user.id, maxMissing)
    return ApiResponse.success(cocktails)
}, { rateLimit: 'makeable' })
