import { pantryService } from '@/services/pantry.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const GET = withUser(async (_req, _ctx, session) => {
    const stats = await pantryService.getStats(session.user.id)
    return ApiResponse.success(stats)
})
