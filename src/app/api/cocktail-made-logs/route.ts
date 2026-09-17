import { cocktailMadeLogService } from '@/services/cocktail-made-log.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

/** GET /api/cocktail-made-logs — list the authenticated user's cocktail-made history */
export const GET = withUser(async (req, _ctx, session) => {
    const page  = Number(req.nextUrl.searchParams.get('page')  ?? '1')
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '50')
    const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true'

    const result = await cocktailMadeLogService.getByUser(session.user.id, page, limit, includeArchived)
    return ApiResponse.paginated(result)
})
