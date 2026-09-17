import { ingredientSubTypeRepository } from '@/repositories/ingredient-subtype.repository'
import { ingredientTypeRepository } from '@/repositories/ingredient-type.repository'
import { NotFoundError, ConflictError, ValidationError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'
import type { Prisma } from '@prisma/client'

export class IngredientSubTypeService {
    // ─── READ ─────────────────────────────────────────────────────────────────

    async getAll(params: QueryParams) {
        return ingredientSubTypeRepository.findMany(params)
    }

    async getById(id: string) {
        const subType = await ingredientSubTypeRepository.findWithDetails(id)
        if (!subType) throw new NotFoundError('Ingredient sub-type not found')
        return subType
    }

    // ─── WRITE ────────────────────────────────────────────────────────────────

    // ✓ UncheckedCreateInput accepts typeId as a plain scalar instead of { connect: { id } }
    async create(data: Prisma.IngredientSubTypeUncheckedCreateInput) {
        const parentExists = await ingredientTypeRepository.exists({ id: data.typeId })
        if (!parentExists) throw new NotFoundError('Ingredient type not found')

        const dup = await ingredientSubTypeRepository.findByNameAndType(data.name, data.typeId)
        if (dup) throw new ConflictError('Sub-type already exists in this type')

        return ingredientSubTypeRepository.create(data)
    }

    // ✓ UncheckedUpdateInput accepts typeId as a plain scalar
    async update(id: string, data: Prisma.IngredientSubTypeUncheckedUpdateInput) {
        const current = await ingredientSubTypeRepository.findWithDetails(id)
        if (!current) throw new NotFoundError('Ingredient sub-type not found')

        const newName   = typeof data.name   === 'string' ? data.name   : current.name
        const newTypeId = typeof data.typeId === 'string' ? data.typeId : current.typeId

        if (!newName) throw new ValidationError('Name is required')

        if (newName !== current.name || newTypeId !== current.typeId) {
            const dup = await ingredientSubTypeRepository.findByNameAndType(newName, newTypeId, id)
            if (dup) throw new ConflictError('Sub-type name already taken in this type')
        }

        const updated = await ingredientSubTypeRepository.update(id, data)
        if (!updated) throw new NotFoundError('Ingredient sub-type not found')
        return updated
    }

    async delete(id: string) {
        const ok = await ingredientSubTypeRepository.hardDelete(id)
        if (!ok) throw new NotFoundError('Ingredient sub-type not found')
    }
}

export const ingredientSubTypeService = new IngredientSubTypeService()