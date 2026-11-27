'use client'

import { useQuery, useQueries } from '@tanstack/react-query'
import { plannedCocktailsApi } from '@/lib/api/planned-cocktails.api'
import { cocktailsApi } from '@/lib/api/cocktails.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

export function usePlannedCocktailsQuery(params: ListParams = {}, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.plannedCocktails.list(params),
        queryFn:  () => plannedCocktailsApi.list(params),
        enabled:  options?.enabled ?? true,
    })
}

export function usePlannedCocktailExists(cocktailId: string) {
    return useQuery({
        queryKey: queryKeys.plannedCocktails.exists(cocktailId),
        queryFn:  () => plannedCocktailsApi.exists(cocktailId),
        enabled:  Boolean(cocktailId),
    })
}

/** Full plan state (planned / done + id) of one cocktail for the current user. */
export function usePlannedCocktailState(cocktailId: string, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: queryKeys.plannedCocktails.state(cocktailId),
        queryFn:  () => plannedCocktailsApi.state(cocktailId),
        enabled:  (options.enabled ?? true) && Boolean(cocktailId),
    })
}

export function usePlannedCocktailsWithDetails(params: ListParams = {}) {
    const planned = usePlannedCocktailsQuery(params)
    const ids = planned.data?.items.map((p) => p.cocktailId) ?? []

    const details = useQueries({
        queries: ids.map((id) => ({
            queryKey: queryKeys.cocktails.detail(id),
            queryFn:  () => cocktailsApi.get(id),
            enabled:  Boolean(id),
        })),
    })

    return {
        planned:   planned.data?.items ?? [],
        cocktails: details.map((d) => d.data).filter(Boolean),
        loading:   planned.isLoading || details.some((d) => d.isLoading),
        error:
            (planned.error as Error | null)?.message ??
            (details.find((d) => d.error)?.error as Error | undefined)?.message ??
            null,
    }
}
