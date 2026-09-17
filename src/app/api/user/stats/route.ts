import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { userStatsService } from '@/services/user-stats.service'

export const GET = withUser(async (_req, _ctx, session) => {
    const stats = await userStatsService.getStats(session.user.id)
    return ApiResponse.success(stats)
})
