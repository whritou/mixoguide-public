import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { BadRequestError } from '@/utils/errors'

export const GET = withUser(async (req, _ctx, session) => {
    const cocktailId = req.nextUrl.searchParams.get('cocktailId')
    if (!cocktailId) throw new BadRequestError('Missing cocktailId parameter')

    const record = await plannedCocktailService.findByUserAndCocktail(session.user.id, cocktailId)

    return ApiResponse.success({
        exists:              !!record,
        plannedCocktailId:   record?.id ?? null,
        status:              record?.status ?? null,
        plannedFor:          record?.plannedFor ?? null,
    })
})
