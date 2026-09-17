import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { plannedCollectionCocktailSchema } from '@/validations'

export const POST = withUser(async (req, { params }, session) => {
    const { id } = await params
    const item = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')
    const body = await req.json()
    const { cocktailId } = plannedCollectionCocktailSchema.parse(body)
    const result = await plannedCollectionService.addCocktail(id, cocktailId)
    return ApiResponse.created(result)
})
