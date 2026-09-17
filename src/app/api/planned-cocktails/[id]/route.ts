import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { updatePlannedCocktailSchema } from '@/validations'
import { withUser } from '@/middlewares/withAuth'

export const GET = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await plannedCocktailService.getById(id)
    const isAdmin = session.user.role === 'ADMIN'
    plannedCocktailService.assertOwnership(item, session.user.id, isAdmin)

    return ApiResponse.success(item)
})

export const PUT = withUser(async (req, { params }, session) => {
    const { id } = await params
    const item = await plannedCocktailService.getById(id)
    const isAdmin = session.user.role === 'ADMIN'
    plannedCocktailService.assertOwnership(item, session.user.id, isAdmin)

    const body = await req.json()
    const { plannedFor: plannedForStr, ...rest } = updatePlannedCocktailSchema.parse(body)
    const updated = await plannedCocktailService.update(id, {
        ...rest,
        ...(plannedForStr ? { plannedFor: new Date(plannedForStr) } : {}),
    })
    return ApiResponse.success(updated)
})

export const DELETE = withUser(async (_req, { params }, session) => {
    const { id } = await params
    const item = await plannedCocktailService.getById(id)
    const isAdmin = session.user.role === 'ADMIN'
    plannedCocktailService.assertOwnership(item, session.user.id, isAdmin)

    await plannedCocktailService.delete(id)
    return ApiResponse.noContent()
})
