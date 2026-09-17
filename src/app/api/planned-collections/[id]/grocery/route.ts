import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const GET = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')
    const list = await plannedCollectionService.getGroceryList(id, session.user.id)
    return ApiResponse.success(list)
})
