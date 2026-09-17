'use client'

import { ingredientTypesApi } from '@/lib/api/ingredient-types.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'
import { createEntityMutations } from './createEntityMutations'
import type { IngredientType } from '@/types/models/ingredient-type'

export const useIngredientTypeMutations = createEntityMutations<IngredientType>({
    api: ingredientTypesApi,
    listKeys: () => queryKeys.ingredientTypes.lists(),
    invalidate: (qc) => invalidators.staticCatalog(qc),
})
