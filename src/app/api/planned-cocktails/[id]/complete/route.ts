import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const POST = withUser(async (_req, { params }, session) => {
    const { id } = await params

    // Load, verify ownership, mark done, decrement pantry
    const item = await plannedCocktailService.getById(id)
    plannedCocktailService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')

    const result = await plannedCocktailService.complete(id)
    return ApiResponse.success(result)
})
