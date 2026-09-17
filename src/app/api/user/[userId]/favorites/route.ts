import { favoriteService } from '@/services/favorite.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { ForbiddenError } from '@/utils/errors'

export const GET = withUser(async (_req, { params }, session) => {
    const { userId } = await params
    const isAdmin = session.user.role === 'ADMIN'

    if (session.user.id !== userId && !isAdmin) {
        throw new ForbiddenError('You can only access your own favorites')
    }

    const cocktailIds = await favoriteService.getByUser(userId)
    return ApiResponse.success(cocktailIds)
})
