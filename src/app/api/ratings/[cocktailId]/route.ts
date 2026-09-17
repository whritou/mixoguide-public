import { NextRequest } from 'next/server'
import { ratingService } from '@/services/rating.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { upsertRatingSchema } from '@/validations'
import { withUser } from '@/middlewares/withAuth'
import { checkRateLimit } from '@/lib/rateLimit'


export const GET = withErrorHandler(async (_req: NextRequest, { params }) => {
    const { cocktailId } = await params

    const [ratings, stats] = await Promise.all([
        ratingService.getByCocktail(cocktailId),
        ratingService.getStats(cocktailId),
    ])

    return ApiResponse.success({ ratings, stats })
})

export const POST = withUser(async (req, { params }, session) => {
    await checkRateLimit('rating', session.user.id)

    const body = await req.json()
    const { cocktailId } = await params

    const data = upsertRatingSchema.parse(body)
    const rating = await ratingService.upsert(session.user.id, cocktailId, data)
    return ApiResponse.created(rating)
})

export const DELETE = withUser(async (_req, { params }, session) => {
    const { cocktailId } = await params

    await ratingService.delete(session.user.id, cocktailId)
    return ApiResponse.noContent()
})
