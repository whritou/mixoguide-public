import { favoriteService } from '@/services/favorite.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { ValidationError } from '@/utils/errors'

export const GET = withUser(async (req, _ctx, session) => {
    const cocktailId = req.nextUrl.searchParams.get('cocktailId')
    if (!cocktailId) throw new ValidationError('Missing cocktailId')

    const exists = await favoriteService.exists(session.user.id, cocktailId)
    return ApiResponse.success({ exists })
})
