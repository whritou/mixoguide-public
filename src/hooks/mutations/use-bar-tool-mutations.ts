'use client'

import { barToolsApi } from '@/lib/api/bar-tools.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'
import { createEntityMutations } from './createEntityMutations'
import type { BarTool } from '@/types/models/bartool'

export const useBarToolMutations = createEntityMutations<BarTool>({
    api: barToolsApi,
    listKeys: () => queryKeys.barTools.lists(),
    invalidate: (qc) => invalidators.staticCatalog(qc),
})
