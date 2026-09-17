import { plannedCollectionRepository } from '@/repositories/planned-collection.repository'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const GET = withUser(async (_req, _ctx, session) => {
    const rsvps = await plannedCollectionRepository.getMyRsvps(session.user.id)
    return ApiResponse.success(rsvps)
})
