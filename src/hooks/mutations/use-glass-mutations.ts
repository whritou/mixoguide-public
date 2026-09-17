'use client'

import { glassesApi } from '@/lib/api/glasses.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'
import { createEntityMutations } from './createEntityMutations'
import type { Glass } from '@/types/models/glass'

export const useGlassMutations = createEntityMutations<Glass>({
    api: glassesApi,
    listKeys: () => queryKeys.glasses.lists(),
    invalidate: (qc) => invalidators.staticCatalog(qc),
})
