'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cocktailMadeLogsApi } from '@/lib/api/cocktail-made-logs.api'
import { invalidators } from '@/lib/invalidation'
import { queryKeys } from '@/lib/query-keys'
import type { CocktailMadeLog } from '@/types/models/cocktail-made-log'

export function useCocktailMadeLogMutations() {
    const qc = useQueryClient()

    const create = useMutation({
        mutationFn: (data: Partial<CocktailMadeLog>) => cocktailMadeLogsApi.create(data),
        onSettled: (_d, _e, vars) =>
            invalidators.cocktailMade(qc, vars.cocktailId ?? ''),
    })

    const remove = useMutation({
        mutationFn: (id: string) => cocktailMadeLogsApi.remove(id),
        onSettled:  () => {
            qc.invalidateQueries({ queryKey: queryKeys.cocktailMadeLogs.all })
            qc.invalidateQueries({ queryKey: queryKeys.userStats.all })
        },
    })

    return { create, remove }
}
