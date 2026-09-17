import { BaseService } from './base.service'
import { ingredientTypeRepository } from '@/repositories/ingredient-type.repository'
import { ConflictError, NotFoundError, ValidationError } from '@/utils/errors'
import type { IngredientType, Prisma } from '@prisma/client'

export class IngredientTypeService extends BaseService<
    IngredientType,
    Prisma.IngredientTypeCreateInput,
    Prisma.IngredientTypeUpdateInput
> {
    protected get repository() { return ingredientTypeRepository }
    protected get entityName()  { return 'Ingredient type' }
    protected get deleteStrategy() { return 'hard' as const }

    // Override getById to include sub-types
    override async getById(id: string) {
        const type = await ingredientTypeRepository.findWithSubTypes(id)
        if (!type) throw new NotFoundError('Ingredient type not found')
        return type
    }

    // Override create to enforce name uniqueness
    override async create(data: Prisma.IngredientTypeCreateInput) {
        const existing = await ingredientTypeRepository.findByName(data.name)
        if (existing) throw new ConflictError('Ingredient type already exists')
        return ingredientTypeRepository.create(data)
    }

    // Override update to enforce name uniqueness
    override async update(id: string, data: Prisma.IngredientTypeUpdateInput) {
        if (!data.name) throw new ValidationError('Name is required')

        if (typeof data.name === 'string') {
            const existing = await ingredientTypeRepository.findByName(data.name)
            if (existing && existing.id !== id) throw new ConflictError('Name already taken')
        }

        return super.update(id, data)
    }
}

export const ingredientTypeService = new IngredientTypeService()
