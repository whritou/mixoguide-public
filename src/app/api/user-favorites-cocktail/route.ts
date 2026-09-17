import { favoriteService } from '@/services/favorite.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { ForbiddenError } from '@/utils/errors'
import { z } from 'zod'

export const GET = withUser(async (req, _ctx, session) => {
    const requestedUserId = req.nextUrl.searchParams.get('userId')

    // Only admins can query other users' favorites
    if (requestedUserId && requestedUserId !== session.user.id) {
        if (session.user.role !== 'ADMIN') throw new ForbiddenError('Forbidden')
    }

    const targetUserId = requestedUserId ?? session.user.id
    const cocktailIds = await favoriteService.getByUser(targetUserId)
    return ApiResponse.success(cocktailIds)
})

export const POST = withUser(async (req, _ctx, session) => {
    const { cocktailId } = z.object({ cocktailId: z.string().cuid() }).parse(await req.json())
    const favorite = await favoriteService.add(session.user.id, cocktailId)
    return ApiResponse.created(favorite)
})
