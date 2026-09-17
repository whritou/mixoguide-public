import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { withUser } from '@/middlewares/withAuth'
import { ForbiddenError } from '@/utils/errors'

export const GET = withUser(async (req, { params }, session) => {
    const { userId } = await params
    const isAdmin = session.user.role === 'ADMIN'

    if (session.user.id !== userId && !isAdmin) {
        throw new ForbiddenError('You can only access your own planned cocktails')
    }

    const queryParams = parseQueryParams(req.nextUrl.searchParams)
    queryParams.filters = { ...queryParams.filters, userId }

    const result = await plannedCocktailService.getAll(queryParams)
    return ApiResponse.paginated(result)
})
