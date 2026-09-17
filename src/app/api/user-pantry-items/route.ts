import { pantryService } from '@/services/pantry.service'
import { ApiResponse } from '@/utils/apiResponse'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { upsertPantryItemSchema } from '@/validations'
import { withUser } from '@/middlewares/withAuth'
import { ForbiddenError } from '@/utils/errors'
import { z } from 'zod'

export const GET = withUser(async (req, _ctx, session) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    // Force filter to current user's items (unless admin querying specific user)
    const requestedUserId = req.nextUrl.searchParams.get('userId')
    if (requestedUserId && requestedUserId !== session.user.id && session.user.role !== 'ADMIN') {
        throw new ForbiddenError('Forbidden')
    }

    if (!params.filters) params.filters = {}
    params.filters.userId = requestedUserId ?? session.user.id

    const result = await pantryService.getAll(params)
    return ApiResponse.paginated(result)
})

export const POST = withUser(async (req, _ctx, session) => {
    const body = await req.json()
    const { ingredientId } = z.object({ ingredientId: z.string().min(1) }).parse(body)
    const data = upsertPantryItemSchema.parse(body)

    const item = await pantryService.upsert(session.user.id, ingredientId, data)
    return ApiResponse.created(item)
})
