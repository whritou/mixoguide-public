import { NextRequest } from 'next/server'
import { cocktailService } from '@/services/cocktail.service'
import { ingredientService } from '@/services/ingredient.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withPublic } from '@/middlewares/withAuth'
import { makeablePreviewSchema } from '@/validations/makeable-preview.validation'
import { DEMO_BOTTLES, type DemoBottle } from '@/lib/demo-bar/demo-bottles'

export const GET = withPublic(async () => {
    const idByName = await ingredientService.findIdsByNames(DEMO_BOTTLES.map(b => b.ingredientName))
    const bottles: DemoBottle[] = DEMO_BOTTLES.map(({ key, label, shelf, image, ingredientName }) => ({
        key,
        ingredientId: idByName[ingredientName] ?? null,
        label,
        shelf,
        image,
    }))
    const response = ApiResponse.success(bottles)
    response.headers.set('Cache-Control', 'public, max-age=3600')
    return response
}, { rateLimit: 'makeable-preview' })

export const POST = withPublic(async (req: NextRequest) => {
    const { ingredientIds, maxMissing, cocktailId } = makeablePreviewSchema.parse(await req.json())
    const preview = await cocktailService.previewMakeable(ingredientIds, maxMissing, cocktailId)
    return ApiResponse.success(preview)
}, { rateLimit: 'makeable-preview' })
