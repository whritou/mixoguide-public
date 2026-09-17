import { api } from './fetcher'
import { mapCocktailMadeLog, mapCocktailMadeLogs } from '@/lib/mappers/cocktail-made-log.mapper'
import type { CocktailMadeLogDto } from '@/lib/mappers/cocktail-made-log.mapper'
import type { CocktailMadeLog } from '@/types/models/cocktail-made-log'
import type { ListParams } from '@/lib/query-keys'

export const cocktailMadeLogsApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<CocktailMadeLogDto>('cocktail-made-logs', params)
        return { items: mapCocktailMadeLogs(res.data), meta: res.meta }
    },
    create: async (data: Partial<CocktailMadeLog>) => {
        const res = await api.post<CocktailMadeLogDto, Partial<CocktailMadeLog>>('cocktail-made-logs', data)
        return mapCocktailMadeLog(res.data)
    },
    remove: (id: string) => api.delete(`cocktail-made-logs/${id}`),
}
