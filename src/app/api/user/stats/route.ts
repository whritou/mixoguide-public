import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { userStatsService } from '@/services/user-stats.service'

export const GET = withUser(async (req, _ctx, session) => {
    // Optional IANA timezone (e.g. "Europe/Paris") so streaks and daily trends
    // follow the user's calendar rather than the server's (DB-011).
    const tz = req.nextUrl.searchParams.get('tz')
    const stats = await userStatsService.getStats(session.user.id, tz)
    return ApiResponse.success(stats)
})
