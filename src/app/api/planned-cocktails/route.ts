import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { createPlannedCocktailSchema } from '@/validations'
import { withUser } from '@/middlewares/withAuth'
import { ForbiddenError } from '@/utils/errors'

export const GET = withUser(async (req, _ctx, session) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const requestedUserId = req.nextUrl.searchParams.get('userId')

    if (requestedUserId && requestedUserId !== session.user.id && session.user.role !== 'ADMIN') {
        throw new ForbiddenError('Forbidden')
    }

    if (!params.filters) params.filters = {}
    if (!requestedUserId && session.user.role !== 'ADMIN') {
        params.filters.userId = session.user.id
    } else if (requestedUserId) {
        params.filters.userId = requestedUserId
    }

    const result = await plannedCocktailService.getAll(params)
    return ApiResponse.paginated(result)
})

export const POST = withUser(async (req, _ctx, session) => {
    const body = await req.json()
    const data = createPlannedCocktailSchema.parse(body)

    const planned = await plannedCocktailService.create({
        ...data,
        plannedFor: new Date(data.plannedFor),
        userId: session.user.id,
    })
    return ApiResponse.created(planned)
})
