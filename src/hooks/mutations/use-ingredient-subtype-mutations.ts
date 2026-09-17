'use client'

import { ingredientSubTypesApi } from '@/lib/api/ingredient-subtypes.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'
import { createEntityMutations } from './createEntityMutations'
import type { IngredientSubType } from '@/types/models/ingredient-sub-type'

export const useIngredientSubTypeMutations = createEntityMutations<IngredientSubType>({
    api: ingredientSubTypesApi,
    listKeys: () => queryKeys.ingredientSubTypes.lists(),
    invalidate: (qc) => invalidators.staticCatalog(qc),
})
