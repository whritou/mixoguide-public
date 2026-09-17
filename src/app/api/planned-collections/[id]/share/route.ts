import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const POST = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')
    const updated = await plannedCollectionService.generateShareToken(id)
    return ApiResponse.success({ shareToken: updated.shareToken, shareEnabled: updated.shareEnabled })
})

export const DELETE = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')
    await plannedCollectionService.revokeShareToken(id)
    return ApiResponse.noContent()
})
