import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { updatePlannedCollectionSchema } from '@/validations'

export const GET = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')
    return ApiResponse.success(item)
})

export const PUT = withUser(async (req, { params }, session) => {
    const { id } = await params
    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')
    const body = await req.json()
    const { plannedFor: plannedForStr, ...rest } = updatePlannedCollectionSchema.parse(body)
    const updated = await plannedCollectionService.update(id, {
        ...rest,
        ...(plannedForStr ? { plannedFor: new Date(plannedForStr) } : {}),
    })
    return ApiResponse.success(updated)
})

export const DELETE = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')
    await plannedCollectionService.delete(id)
    return ApiResponse.noContent()
})
