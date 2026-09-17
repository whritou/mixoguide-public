import { prisma } from '@/lib/db/prisma'
import { BaseRepository, toDelegate, type RepositoryConfig } from '@/repositories/base.repository'
import { QueryBuilder } from '@/lib/query/QueryBuilder'
import { NotFoundError } from '@/utils/errors'
import type { QueryParams, PaginatedResult } from '@/lib/query/types'
import type { CreateIngredientInput, UpdateIngredientInput } from '@/validations'
import type { Ingredient, Prisma } from '@prisma/client'

class IngredientRepository extends BaseRepository<
    Ingredient,
    Prisma.IngredientUncheckedCreateInput,
    Prisma.IngredientUncheckedUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.ingredient)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'ingredient',
            // 'usageCount' is a virtual sort key resolved by QueryBuilder into
            // `orderBy: { cocktailIngredients: { _count: ... } }`. The list UI
            // surfaces the most-used ingredients first by default.
            allowedSortFields: ['name', 'createdAt', 'abv', 'usageCount'],
            allowedFilters:    ['typeId', 'subTypeId', 'isAlcoholic', 'unit'],
            allowedIncludes:   ['type', 'subType', 'pantryItems'],
            searchFields:      ['name', 'brand'],
            defaultSortField:  'usageCount',
            defaultOrderBy: [
                { cocktailIngredients: { _count: 'desc' } },
                { name: 'asc' },
            ],
            softDelete:        false,
        }
    }

    /**
     * Always include `_count.cocktailIngredients` on list responses so cards
     * can show "Used in N cocktails" without a follow-up query. Prisma forbids
     * combining `select` with relation-count includes the way we need, so we
     * route through `include` and rely on the entity's default scalar fields.
     */
    async findMany(params: QueryParams = {}): Promise<PaginatedResult<Ingredient>> {
        const { skip, take, page, limit, orderBy, where, include } =
            QueryBuilder.build(params, this.config)

        const baseWhere = { ...this.softWhere, ...where, ...(params.extraWhere ?? {}) }

        const [data, total] = await Promise.all([
            prisma.ingredient.findMany({
                where: baseWhere,
                orderBy,
                skip,
                take,
                include: {
                    ...(include ?? {}),
                    _count: { select: { cocktailIngredients: true } },
                },
            }),
            prisma.ingredient.count({ where: baseWhere }),
        ])

        return QueryBuilder.buildPaginatedResult(data as Ingredient[], total, page, limit)
    }
}

const ingredientRepository = new IngredientRepository()

// The detail pages (public and admin) never render the list of cocktails that
// use the ingredient -- only its name, type, abv, brand, description, and a
// "used in N cocktails" stat. We therefore only ship the _count, not the full
// relation, which previously meant up to 200 nested cocktail rows for popular
// ingredients like vodka or lime.
const INGREDIENT_FULL_DETAILS_SELECT = {
    id: true, name: true, typeId: true, subTypeId: true,
    isAlcoholic: true, abv: true, brand: true,
    imageUrl: true, unit: true,
    description: true,
    type:    { select: { id: true, name: true } },
    subType: { select: { id: true, name: true, typeId: true } },
    _count: { select: { cocktailIngredients: true } },
} as const

class IngredientService {
    async getAll(params: QueryParams) {
        return ingredientRepository.findMany(params)
    }

    async getById(id: string) {
        const ingredient = await prisma.ingredient.findUnique({
            where: { id },
            select: INGREDIENT_FULL_DETAILS_SELECT,
        })
        if (!ingredient) throw new NotFoundError('Ingredient not found')
        return ingredient
    }

    async create(data: CreateIngredientInput) {
        return ingredientRepository.create(data)
    }

    async update(id: string, data: UpdateIngredientInput) {
        const ingredient = await ingredientRepository.update(id, data)
        if (!ingredient) throw new NotFoundError('Ingredient not found')
        return ingredient
    }

    async delete(id: string) {
        const ok = await ingredientRepository.hardDelete(id)
        if (!ok) throw new NotFoundError('Ingredient not found')
    }
}

export const ingredientService = new IngredientService()
