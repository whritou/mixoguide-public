'use client'

import { ingredientsApi } from '@/lib/api/ingredients.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'
import { createEntityMutations } from './createEntityMutations'
import type { Ingredient } from '@/types/models/ingredient'

export const useIngredientMutations = createEntityMutations<Ingredient>({
    api: ingredientsApi,
    listKeys: () => queryKeys.ingredients.lists(),
    detailKey: (id) => queryKeys.ingredients.detail(id),
    invalidate: (qc) => invalidators.ingredients(qc),
})
