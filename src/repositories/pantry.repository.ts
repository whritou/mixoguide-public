import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import { QueryBuilder } from '@/lib/query/QueryBuilder'
import { getDerivationMap, convertUnit, type DerivationMap } from '@/lib/derivations/derivation-cache'
import { isNonBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'
import { resolveIngredientUnitFallback } from '@/utils/ingredientUnitFallback'
import { Prisma, type UserPantryItem, type MeasureUnit } from '@prisma/client'
import type { QueryParams, PaginatedResult } from '@/lib/query/types'

type PantryPrismaClient = Pick<Prisma.TransactionClient, 'userPantryItem' | 'ingredient' | 'ingredientType'>

/**
 * Round a pantry quantity after deduction.
 * - pcs items: floor to the nearest 0.5 (e.g. 0.78 → 0.5, 1.22 → 1.0)
 *   so users never see weird decimals on countable items like lemons.
 * - all other units: keep two decimal places.
 */
function roundPantryQty(qty: number, unit: string): number {
    if (unit === 'pcs') return Math.floor(qty / 0.5) * 0.5
    return +qty.toFixed(2)
}

/** Ingredient fields included for card display */
const INGREDIENT_SELECT = {
    id: true, name: true, imageUrl: true, isAlcoholic: true,
    type:    { select: { id: true, name: true } },
    subType: { select: { id: true, name: true } },
} as const

const LOW_STOCK_THRESHOLDS: Record<string, number> = {
    cl: 10, ml: 100, oz: 3.4, g: 50,
    pcs: 2, zest: 2, slice: 2, twist: 2,
}

function preprocessPantryParams(params: QueryParams) {
    if (!params.filters) return

    const filters = params.filters as Record<string, unknown>
    const extraWhere: Record<string, unknown> = {}

    const status = typeof filters.status === 'string' ? filters.status : null
    const stockStatusParam = typeof filters.stockStatus === 'string' ? filters.stockStatus : null
    delete filters.status
    delete filters.stockStatus

    const scopeStatus =
        status === 'in-pantry' || status === 'shopping'
            ? status
            : null
    if (scopeStatus === 'in-pantry') {
        filters.isInPantry = true
    } else if (scopeStatus === 'shopping') {
        filters.isInShoppingList = true

    }

    // Keep backward compatibility for old links where stock status lived in "status".
    const legacyStockStatus =
        status === 'out-of-stock' || status === 'low-stock' || status === 'expiring'
            ? status
            : null
    const stockStatus =
        stockStatusParam === 'out-of-stock' || stockStatusParam === 'low-stock' || stockStatusParam === 'expiring'
            ? stockStatusParam
            : legacyStockStatus

    if (stockStatus === 'out-of-stock') {
        Object.assign(extraWhere, { isInPantry: true, quantity: 0 })
    } else if (stockStatus === 'low-stock') {
        Object.assign(extraWhere, {
            isInPantry: true,
            OR: Object.entries(LOW_STOCK_THRESHOLDS).map(([unit, threshold]) => ({
                unitLeft: unit,
                quantity: { gt: 0, lte: threshold },
            })),
        })
    } else if (stockStatus === 'expiring') {
        const now = new Date()
        const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        Object.assign(extraWhere, {
            expirationDate: {
                gt: now,
                lt: soon,
            },
        })
    }

    const category = typeof filters.category === 'string' ? filters.category.trim() : ''
    delete filters.category
    if (category) {
        Object.assign(extraWhere, {
            ingredient: { type: { name: category } },
        })
    }

    if (Object.keys(extraWhere).length > 0) {
        params.extraWhere = params.extraWhere
            ? { AND: [params.extraWhere, extraWhere] }
            : extraWhere
    }
}

function isNotFoundError(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'
}

/** Plain upsert payload — avoids leaking Prisma update-input types to callers. */
export interface PantryUpsertData {
    quantity?:         number
    unitLeft?:         string
    favorite?:         boolean
    isEssential?:      boolean
    isInfinite?:       boolean
    isInPantry?:       boolean
    isInShoppingList?: boolean
    shoppingQuantity?: number
    expirationDate?:   Date | string | null
    note?:             string | null
}

export type PantryUsage = {
    ingredientId: string
    amount: number | null
    unit: string | null
    optional?: boolean
    ingredient?: {
        name?: string | null
        isAlcoholic?: boolean | null
        type?: { name?: string | null } | null
        subType?: { name?: string | null } | null
    } | null
}

type PantryLockRow = {
    id: string
    ingredientId: string
    quantity: number | null
    unitLeft: string | null
    isInfinite: boolean
}

/**
 * Pure planning step of the pantry decrement: walks every usage against an
 * in-memory snapshot of the (locked) pantry rows, falling back to derivation
 * base ingredients, and returns the total amount to remove per pantry row.
 */
export function planPantryDecrements(
    rows: PantryLockRow[],
    usages: PantryUsage[],
    derivationMap: DerivationMap,
): Array<{ id: string; delta: number }> {
    const snapshot = rows.map((r) => ({ ...r, original: r.quantity ?? 0, quantity: r.quantity ?? 0 }))
    const pantryByIngredientId = new Map(snapshot.map((i) => [i.ingredientId, i]))

    for (const usage of usages) {
        if (isNonBlockingCocktailIngredient(usage) || !usage.unit) continue

        let remainingAmount = usage.amount
        if (remainingAmount == null || remainingAmount <= 0) continue

        const conversionContext = {
            ingredientName: usage.ingredient?.name,
            typeName: usage.ingredient?.type?.name,
            subTypeName: usage.ingredient?.subType?.name,
            isAlcoholic: usage.ingredient?.isAlcoholic,
        }

        let pantryItem = pantryByIngredientId.get(usage.ingredientId)
        if (pantryItem?.isInfinite) continue

        if (pantryItem) {
            const pantryUnit = pantryItem.unitLeft as string
            const neededInPantryUnit = convertUnit(remainingAmount, usage.unit, pantryUnit, conversionContext)

            if (neededInPantryUnit !== null && neededInPantryUnit > 0) {
                const currentQty = pantryItem.quantity
                const deducted = Math.min(neededInPantryUnit, currentQty)

                if (deducted > 0) {
                    pantryItem.quantity = roundPantryQty(Math.max(0, currentQty - deducted), pantryUnit)
                }

                if (deducted + 1e-6 >= neededInPantryUnit) continue

                const fulfilledRatio = neededInPantryUnit > 0 ? deducted / neededInPantryUnit : 0
                remainingAmount = +(remainingAmount * (1 - fulfilledRatio)).toFixed(4)
            }
        }

        if (remainingAmount <= 0) continue

        const derivations = derivationMap.get(usage.ingredientId)
        if (!derivations) continue

        for (const d of derivations) {
            pantryItem = pantryByIngredientId.get(d.baseIngredientId)
            if (!pantryItem) continue
            if (pantryItem.isInfinite) { remainingAmount = 0; break }

            if (d.yieldAmount <= 0) continue
            const remainingInYieldUnit = convertUnit(remainingAmount, usage.unit, d.yieldUnit, conversionContext)
            if (remainingInYieldUnit === null || remainingInYieldUnit <= 0) continue

            const baseUnitsNeeded = remainingInYieldUnit / d.yieldAmount
            if (baseUnitsNeeded <= 0) continue

            const currentQty   = pantryItem.quantity
            const pantryUnit   = pantryItem.unitLeft as string
            const deductedBase = Math.min(baseUnitsNeeded, currentQty)
            if (deductedBase <= 0) continue

            pantryItem.quantity = roundPantryQty(Math.max(0, currentQty - deductedBase), pantryUnit)

            const fulfilledRatio = baseUnitsNeeded > 0 ? deductedBase / baseUnitsNeeded : 0
            remainingAmount = +(remainingAmount * (1 - fulfilledRatio)).toFixed(4)
            if (remainingAmount <= 1e-4) break
        }
    }

    return snapshot
        .filter((i) => !i.isInfinite && i.original - i.quantity > 1e-9)
        .map((i) => ({ id: i.id, delta: +(i.original - i.quantity).toFixed(6) }))
}

class PantryRepository extends BaseRepository<
    UserPantryItem,
    Prisma.UserPantryItemUncheckedCreateInput,
    Prisma.UserPantryItemUncheckedUpdateInput
> {
    protected get model() { return toDelegate(prisma.userPantryItem) }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'userPantryItem',
            allowedSortFields: ['addedAt', 'updatedAt', 'quantity', 'shoppingQuantity', 'expirationDate', 'favorite', 'ingredient.name'],
            allowedFilters:    ['userId', 'isInPantry', 'isInShoppingList', 'favorite', 'isEssential'],
            allowedIncludes:   ['ingredient', 'ingredient.type', 'ingredient.subType'],
            searchFields:      ['note', 'ingredient.name'],
            defaultSortField:  'addedAt',
            preprocessParams:  preprocessPantryParams,
        }
    }

    // Override findMany to always include ingredient data in a single query
    async findMany(params: QueryParams = {}): Promise<PaginatedResult<UserPantryItem>> {
        const { skip, take, page, limit, orderBy, where, include } =
            QueryBuilder.build(params, this.config)

        const baseWhere = { ...this.softWhere, ...where, ...(params.extraWhere ?? {}) }

        const [data, total] = await Promise.all([
            prisma.userPantryItem.findMany({
                where: baseWhere,
                orderBy,
                skip,
                take,
                include: {
                    ...(include ?? {}),
                    ingredient: { select: INGREDIENT_SELECT },
                },
            }),
            prisma.userPantryItem.count({ where: baseWhere }),
        ])

        return QueryBuilder.buildPaginatedResult(data as UserPantryItem[], total, page, limit)
    }

    /** Paginated list of pantry items for a user (isInPantry: true). */
    async findByUser(userId: string, page = 1, limit = 100) {
        const safeLimit = Math.min(200, Math.max(1, limit))
        const skip      = (Math.max(1, page) - 1) * safeLimit

        const where = { userId, isInPantry: true }
        const [data, total] = await Promise.all([
            prisma.userPantryItem.findMany({
                where,
                include: { ingredient: { select: INGREDIENT_SELECT } },
                orderBy: { addedAt: 'desc' },
                skip,
                take:    safeLimit,
            }),
            prisma.userPantryItem.count({ where }),
        ])

        return QueryBuilder.buildPaginatedResult(data, total, page, safeLimit)
    }

    /** Paginated shopping list for a user (isInShoppingList: true). */
    async findShoppingList(userId: string, page = 1, limit = 100) {
        const safeLimit = Math.min(200, Math.max(1, limit))
        const skip      = (Math.max(1, page) - 1) * safeLimit

        const where = { userId, isInShoppingList: true }
        const [data, total] = await Promise.all([
            prisma.userPantryItem.findMany({
                where,
                include: { ingredient: { select: { id: true, name: true, unit: true } } },
                orderBy: { addedAt: 'desc' },
                skip,
                take:    safeLimit,
            }),
            prisma.userPantryItem.count({ where }),
        ])

        return QueryBuilder.buildPaginatedResult(data, total, page, safeLimit)
    }

    /**
     * Decrement pantry quantities after completing ONE cocktail.
     * See {@link decrementForCocktails}.
     */
    async decrementForCocktail(
        userId: string,
        ingredients: PantryUsage[],
        tx?: Prisma.TransactionClient,
    ) {
        return this.decrementForCocktails(userId, [ingredients], tx)
    }

    /**
     * Decrement pantry quantities for one or more cocktails in a single pass
     * (DB-001 / DB-012).
     *
     * Concurrency: the user's in-pantry rows are locked with `SELECT … FOR UPDATE`
     * inside the transaction, so two concurrent decrements for the same user are
     * serialised (READ COMMITTED + row locks — no SERIALIZABLE isolation needed).
     * The resulting deltas are then applied with a single *relative* UPDATE
     * (`quantity = quantity - delta`, clamped at 0), so even a writer that does not
     * take the lock cannot cause a lost deduction.
     *
     * When `tx` is omitted a dedicated transaction is opened; pass the caller's
     * transaction client to make the decrement atomic with other writes.
     */
    async decrementForCocktails(
        userId: string,
        cocktails: PantryUsage[][],
        tx?: Prisma.TransactionClient,
    ): Promise<void> {
        const usages = cocktails.flat()
        if (usages.length === 0) return

        if (!tx) {
            await prisma.$transaction((innerTx) => this.decrementForCocktails(userId, cocktails, innerTx))
            return
        }

        const derivationMap = await getDerivationMap()

        const lockedRows = await tx.$queryRaw<PantryLockRow[]>`
            SELECT id, ingredient_id AS "ingredientId", quantity, unit_left::text AS "unitLeft", is_infinite AS "isInfinite"
              FROM user_pantry_items
             WHERE user_id = ${userId} AND is_in_pantry = true
             ORDER BY id
               FOR UPDATE
        `
        if (lockedRows.length === 0) return

        const plan = planPantryDecrements(lockedRows, usages, derivationMap)
        if (plan.length === 0) return

        const ids    = plan.map((p) => p.id)
        const deltas = plan.map((p) => p.delta)
        await tx.$executeRaw`
            UPDATE user_pantry_items AS p
               SET quantity = CASE
                       WHEN p.unit_left = 'pcs'
                           THEN floor(round(GREATEST(0, p.quantity - v.delta)::numeric, 6) / 0.5) * 0.5
                       ELSE round(GREATEST(0, p.quantity - v.delta)::numeric, 2)
                   END::double precision,
                   updated_at = NOW()
              FROM (SELECT unnest(${ids}::text[]) AS id, unnest(${deltas}::double precision[]) AS delta) AS v
             WHERE p.id = v.id
               AND p.user_id = ${userId}
               AND p.is_infinite = false
        `
    }

    async getStats(userId: string) {
        const lowStockOr = Object.entries(LOW_STOCK_THRESHOLDS).map(([unit, threshold]) => ({
            unitLeft: unit as MeasureUnit,
            quantity: { gt: 0, lte: threshold },
        }))

        // Categories: query types directly and use a filtered relation count
        // so name + count come back in one round trip. This replaces the old
        // groupBy + ingredientType.findMany pair without dropping to raw SQL.
        const [total, out, low, toBuy, categoryRows] = await Promise.all([
            prisma.userPantryItem.count({ where: { userId, isInPantry: true } }),
            prisma.userPantryItem.count({ where: { userId, isInPantry: true, quantity: 0 } }),
            prisma.userPantryItem.count({ where: { userId, isInPantry: true, OR: lowStockOr } }),
            prisma.userPantryItem.count({ where: { userId, isInShoppingList: true } }),
            prisma.ingredientType.findMany({
                select: {
                    name: true,
                    _count: {
                        select: {
                            ingredients: {
                                where: { pantryItems: { some: { userId, isInPantry: true } } },
                            },
                        },
                    },
                },
            }),
        ])

        const categories = categoryRows
            .map(t => ({ name: t.name, count: t._count.ingredients }))
            .filter(c => c.count > 0)
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

        return { total, low, out, toBuy, categories }
    }

    async findByUserAndIngredient(userId: string, ingredientId: string, client: PantryPrismaClient = prisma) {
        return client.userPantryItem.findUnique({
            where: { userId_ingredientId: { userId, ingredientId } },
        })
    }

    async update(
        id: string,
        data: Prisma.UserPantryItemUncheckedUpdateInput | Prisma.UserPantryItemUpdateInput,
        client: PantryPrismaClient = prisma,
    ): Promise<UserPantryItem | null> {
        try {
            return await client.userPantryItem.update({
                where: { id },
                data,
            })
        } catch (err) {
            if (isNotFoundError(err)) return null
            throw err
        }
    }

    async createItem(
        userId: string,
        ingredientId: string,
        data: PantryUpsertData & { unitLeft: string },
        client: PantryPrismaClient = prisma,
    ) {
        return client.userPantryItem.create({
            data: {
                userId,
                ingredientId,
                quantity:         data.quantity         ?? 0,
                shoppingQuantity: data.shoppingQuantity ?? 0,
                unitLeft:         data.unitLeft as MeasureUnit,
                favorite:         data.favorite,
                isEssential:      data.isEssential,
                isInfinite:       data.isInfinite,
                isInPantry:       data.isInPantry,
                isInShoppingList: data.isInShoppingList,
                expirationDate:   data.expirationDate ? new Date(data.expirationDate) : undefined,
                note:             data.note ?? undefined,
            },
            include: { ingredient: { select: INGREDIENT_SELECT } },
        })
    }

    async importIngredientsIntoEmptyPantry(userId: string, ingredientIds: string[]): Promise<number> {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.userPantryItem.count({ where: { userId } })
            if (existing > 0) return 0

            const ingredients = await tx.ingredient.findMany({
                where:  { id: { in: ingredientIds } },
                select: {
                    id: true, name: true, isAlcoholic: true,
                    type:    { select: { name: true } },
                    subType: { select: { name: true } },
                },
            })
            if (ingredients.length === 0) return 0

            const result = await tx.userPantryItem.createMany({
                data: ingredients.map((ingredient) => ({
                    userId,
                    ingredientId: ingredient.id,
                    quantity:     0,
                    unitLeft:     resolveIngredientUnitFallback({
                        ingredientName: ingredient.name,
                        typeName:       ingredient.type?.name,
                        subTypeName:    ingredient.subType?.name,
                        isAlcoholic:    ingredient.isAlcoholic,
                    }) as MeasureUnit,
                    isInPantry:   true,
                    isInfinite:   true,
                })),
                skipDuplicates: true,
            })
            return result.count
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    }
}

export const pantryRepository = new PantryRepository()
