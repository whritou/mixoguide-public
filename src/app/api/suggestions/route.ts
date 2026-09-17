import { suggestionService } from '@/services/suggestion.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin, withUser } from '@/middlewares/withAuth'
import { parseQueryParams } from '@/utils/parseQueryParams'
import { createSuggestionSchema } from '@/validations'
import { checkRateLimit } from '@/lib/rateLimit'

export const GET = withAdmin(async (req, _ctx, _session) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await suggestionService.getAll(params)
    return ApiResponse.paginated(result)
})

export const POST = withUser(async (req, _ctx, session) => {
    await checkRateLimit('suggestion', session.user.id)

    const body = await req.json()
    const data = createSuggestionSchema.parse(body)
    const suggestion = await suggestionService.create(data, session.user.id, session.user.name)
    return ApiResponse.created(suggestion)
})
