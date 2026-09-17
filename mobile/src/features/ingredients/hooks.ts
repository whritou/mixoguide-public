import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { ingredientsApi, ingredientTypesApi, ingredientSubTypesApi, type IngredientListParams } from '@/api/endpoints/ingredients'
import { keys } from '@/lib/query-keys'

const INGREDIENTS_PAGE_SIZE = 40

function getNextListPage(lastPage: { data?: unknown[]; meta?: { page?: number; totalPages?: number } } | undefined) {
    const items = Array.isArray(lastPage?.data) ? lastPage.data : []
    if (items.length === 0) return undefined

    const page = Number(lastPage?.meta?.page ?? 1)
    const totalPages = Number(lastPage?.meta?.totalPages ?? page)
    if (!Number.isFinite(page) || !Number.isFinite(totalPages)) return undefined

    return page < totalPages ? page + 1 : undefined
}

export function useIngredients(params: IngredientListParams = {}) {
    return useQuery({
        queryKey: keys.ingredients.list(params),
        queryFn:  () => ingredientsApi.list(params).then(r => r.data),
        staleTime: 1000 * 60 * 5,
    })
}

export function useInfiniteIngredients(params: Omit<IngredientListParams, 'page' | 'offset'>) {
    return useInfiniteQuery({
        queryKey:         keys.ingredients.list(params),
        queryFn:          ({ pageParam }) =>
            ingredientsApi.list({ ...params, limit: INGREDIENTS_PAGE_SIZE, page: pageParam }).then(r => r.data),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => getNextListPage(lastPage),
        staleTime: 1000 * 60 * 5,
    })
}

export function useIngredient(id: string) {
    return useQuery({
        queryKey: keys.ingredients.detail(id),
        queryFn:  () => ingredientsApi.getById(id).then(r => r.data.data),
        enabled:  !!id,
        staleTime: 1000 * 60 * 10,
    })
}

export function useIngredientTypes() {
    return useQuery({
        queryKey: keys.ingredientTypes.all,
        queryFn:  () => ingredientTypesApi.list().then(r => r.data.data),
        staleTime: 1000 * 60 * 30,
    })
}

export function useIngredientSubTypes() {
    return useQuery({
        queryKey: keys.ingredientSubTypes.all,
        queryFn:  () => ingredientSubTypesApi.list().then(r => r.data.data),
        staleTime: 1000 * 60 * 30,
    })
}
