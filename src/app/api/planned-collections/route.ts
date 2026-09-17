import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { withUser } from '@/middlewares/withAuth'
import { createPlannedCollectionSchema } from '@/validations'
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

    const result = await plannedCollectionService.getAll(params)
    return ApiResponse.paginated(result)
})

export const POST = withUser(async (req, _ctx, session) => {
    const body = await req.json()
    const data = createPlannedCollectionSchema.parse(body)
    const item = await plannedCollectionService.create(session.user.id, {
        ...data,
        plannedFor: new Date(data.plannedFor),
    })
    return ApiResponse.created(item)
})
