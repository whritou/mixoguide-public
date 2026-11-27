import { z } from 'zod'

export const makeablePreviewSchema = z.object({
    ingredientIds: z.array(z.string().min(1).max(64)).min(1).max(40),
    maxMissing: z.union([z.literal(0), z.literal(1)]).optional(),
    cocktailId: z.string().min(1).max(64).optional(),
})

export type MakeablePreviewInput = z.infer<typeof makeablePreviewSchema>
