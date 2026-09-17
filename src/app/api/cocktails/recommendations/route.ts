import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { recommendationService } from '@/services/recommendation.service'
import { checkRateLimit } from '@/lib/rateLimit'

export const GET = withUser(async (_req, _ctx, session) => {
    await checkRateLimit('recommendation', session.user.id)
    const recommendations = await recommendationService.getRecommendations(session.user.id)
    return ApiResponse.success(recommendations)
})
