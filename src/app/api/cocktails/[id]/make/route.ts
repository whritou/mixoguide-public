import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { makeCocktailNowSchema } from '@/validations'
import { withUser } from '@/middlewares/withAuth'
import { normalizeIdempotencyKey } from '@/lib/cache/idempotency'

export const POST = withUser(async (req, { params }, session) => {
    const { id } = await params
    const body   = await req.json()
    const { quantity } = makeCocktailNowSchema.parse(body)

    // Optional `Idempotency-Key` header: a retried request with the same key gets
    // 409 instead of logging the cocktail and deducting the pantry twice.
    const idempotencyKey = normalizeIdempotencyKey(req.headers.get('idempotency-key'))

    const result = await plannedCocktailService.makeNow(session.user.id, id, quantity, { idempotencyKey })
    return ApiResponse.created(result)
}, { rateLimit: 'bulk-add' })
