import { cache } from 'react'
import { ingredientService } from '@/services/ingredient.service'
import { mapIngredient } from '@/lib/mappers/ingredient.mapper'
import { NotFoundError } from '@/utils/errors'
import type { Ingredient, IngredientDTO } from '@/types/models/ingredient'

/**
 * Server-only loader shared by `generateMetadata` and the page (one DB read per
 * view). JSON round-trip gives the exact GET /api/ingredients/:id wire shape,
 * then the client mapper is applied. Catalog data only.
 */
export const getIngredient = cache(async (id: string): Promise<Ingredient | null> => {
    try {
        const row = await ingredientService.getById(id)
        return mapIngredient(JSON.parse(JSON.stringify(row)) as IngredientDTO)
    } catch (error) {
        if (error instanceof NotFoundError) return null
        throw error
    }
})
