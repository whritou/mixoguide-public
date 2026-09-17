import { favoriteService } from '@/services/favorite.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const GET = withUser(async (_req, { params }, session) => {
    const { cocktailId } = await params

    const exists = await favoriteService.exists(session.user.id, cocktailId)
    return ApiResponse.success({ exists })
})

export const DELETE = withUser(async (_req, { params }, session) => {
    const { cocktailId } = await params

    await favoriteService.remove(session.user.id, cocktailId)
    return ApiResponse.noContent()
})
