import { getDerivationMap } from '@/lib/derivations/derivation-cache'
import { ApiResponse } from '@/utils/apiResponse'
import { withPublic } from '@/middlewares/withAuth'

export const GET = withPublic(async () => {
    const map = await getDerivationMap()

    // Serialize the Map as a plain object for JSON transport
    const result: Record<string, Array<{ baseIngredientId: string; yieldAmount: number; yieldUnit: string }>> = {}
    for (const [derivedId, entries] of map) {
        result[derivedId] = entries.map((e) => ({
            baseIngredientId: e.baseIngredientId,
            yieldAmount: e.yieldAmount,
            yieldUnit: e.yieldUnit,
        }))
    }

    return ApiResponse.success(result)
}, { rateLimit: 'public-read' })
