import { cocktailMadeLogService } from '@/services/cocktail-made-log.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

/** DELETE /api/cocktail-made-logs/:id — remove a single making-history entry */
export const DELETE = withUser(async (_req, { params }, session) => {
    const { id } = await params

    await cocktailMadeLogService.delete(id, session.user.id, session.user.role === 'ADMIN')
    return ApiResponse.noContent()
})
