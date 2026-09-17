import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const DELETE = withUser(async (_req, { params }, session) => {
    const { id, cocktailId } = await params
    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')
    await plannedCollectionService.removeCocktail(id, cocktailId)
    return ApiResponse.noContent()
})
