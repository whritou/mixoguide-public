import { cache } from 'react'
import { cocktailService } from '@/services/cocktail.service'
import { mapCocktail } from '@/lib/mappers/cocktail.mapper'
import { NotFoundError } from '@/utils/errors'
import type { Cocktail, CocktailDTO } from '@/types/models/cocktail'

/**
 * Server-only loader shared by `generateMetadata` (layout) and the page via
 * React `cache()`, so one detail view costs one DB read.
 *
 * The row is round-tripped through JSON so it has exactly the wire shape of
 * GET /api/cocktails/:id (Dates → ISO strings, no Prisma class instances) and
 * is then mapped with the same mapper the client API uses. Only public catalog
 * fields are selected by `findWithFullDetails` (no user data).
 */
export const getCocktail = cache(async (id: string): Promise<Cocktail | null> => {
    try {
        const row = await cocktailService.getById(id)
        return mapCocktail(JSON.parse(JSON.stringify(row)) as CocktailDTO)
    } catch (error) {
        if (error instanceof NotFoundError) return null
        throw error
    }
})
