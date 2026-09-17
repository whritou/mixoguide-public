import { pantryService } from '@/services/pantry.service'
import { ApiResponse } from '@/utils/apiResponse'
import { upsertPantryItemSchema } from '@/validations'
import { withUser } from '@/middlewares/withAuth'

export const GET = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await pantryService.getById(id)
    const isAdmin = session.user.role === 'ADMIN'
    pantryService.assertOwnership(item, session.user.id, isAdmin)

    return ApiResponse.success(item)
})

export const PUT = withUser(async (req, { params }, session) => {
    const { id } = await params
    const item = await pantryService.getById(id)
    const isAdmin = session.user.role === 'ADMIN'
    pantryService.assertOwnership(item, session.user.id, isAdmin)

    const body = await req.json()
    const data = upsertPantryItemSchema.partial().parse(body)
    const updated = await pantryService.update(id, data)
    return ApiResponse.success(updated)
})

export const DELETE = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await pantryService.getById(id)
    const isAdmin = session.user.role === 'ADMIN'
    pantryService.assertOwnership(item, session.user.id, isAdmin)

    await pantryService.delete(id)
    return ApiResponse.noContent()
})
