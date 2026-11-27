import { pantryRepository, type PantryUpsertData } from '@/repositories/pantry.repository'
import { prisma } from '@/lib/db/prisma'
import { withSerializableRetry } from '@/lib/db/transaction'
import { invalidateMakeableCache } from '@/lib/cache/makeable-cache'
import { convertUnit } from '@/utils/unitConversion'
import { resolveIngredientUnitFallback } from '@/utils/ingredientUnitFallback'
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'
import type { UnitConversionContext } from '@/utils/unitConversion'
import { Prisma, type MeasureUnit } from '@prisma/client'

export type { PantryUpsertData }

function convertOrThrow(
    amount: number,
    fromUnit: string,
    toUnit: string,
    context: string,
    conversionContext?: UnitConversionContext,
): number {
    if (fromUnit === toUnit) return amount

    const converted = convertUnit(amount, fromUnit, toUnit, conversionContext)
    if (converted === null) {
        throw new ValidationError(`Cannot convert ${context} from "${fromUnit}" to "${toUnit}"`)
    }
    return converted
}

class PantryService {
    private async getIngredientConversionContext(
        ingredientId: string,
        client: Pick<Prisma.TransactionClient, 'ingredient'> = prisma,
    ): Promise<UnitConversionContext> {
        const ingredient = await client.ingredient.findUnique({
            where: { id: ingredientId },
            select: {
                name: true,
                isAlcoholic: true,
                type: { select: { name: true } },
                subType: { select: { name: true } },
            },
        })
        return {
            ingredientName: ingredient?.name,
            typeName: ingredient?.type?.name,
            subTypeName: ingredient?.subType?.name,
            isAlcoholic: ingredient?.isAlcoholic,
        }
    }

    private async resolveFallbackUnit(
        ingredientId: string,
        client: Pick<Prisma.TransactionClient, 'ingredient'> = prisma,
    ): Promise<MeasureUnit> {
        const context = await this.getIngredientConversionContext(ingredientId, client)
        return resolveIngredientUnitFallback(context) as MeasureUnit
    }

    async getAll(params: QueryParams) {
        return pantryRepository.findMany(params)
    }

    async getStats(userId: string) {
        return pantryRepository.getStats(userId)
    }

    async getById(id: string) {
        const item = await pantryRepository.findById(id, ['ingredient'])
        if (!item) throw new NotFoundError('Pantry item not found')
        return item
    }

    /**
     * Add an ingredient to the pantry or shopping list.
     *
     * Rules:
     *  - One row per ingredient (unique constraint). Quantities are always AGGREGATED.
     *  - isInPantry  = true  → adds `quantity` to the existing pantry quantity.
     *  - isInShoppingList = true → adds `quantity` to the existing shoppingQuantity.
     *  - Both flags can be true simultaneously (ingredient has stock AND is on the list).
     *  - Only pantry quantity is used as source of truth for grocery calculations.
     */
    async upsert(userId: string, ingredientId: string, data: PantryUpsertData) {
        const item = await withSerializableRetry(
            (tx) => this.upsertInTx(tx, userId, ingredientId, data),
            // P2002: a concurrent request inserted the row first — retry as an update.
            { retryOnCodes: ['P2002'] },
        )
        await invalidateMakeableCache(userId)
        return item
    }

    /**
     * Upsert logic run inside the caller's SERIALIZABLE transaction. Callers must
     * retry on P2034 (see `withSerializableRetry`).
     */
    private async upsertInTx(
        tx: Prisma.TransactionClient,
        userId: string,
        ingredientId: string,
        data: PantryUpsertData,
    ) {
        const existing = await pantryRepository.findByUserAndIngredient(userId, ingredientId, tx)
        const requestedUnit = data.unitLeft as MeasureUnit | undefined
        let conversionContext: UnitConversionContext | undefined
        const ensureConversionContext = async () => {
            if (!conversionContext) {
                conversionContext = await this.getIngredientConversionContext(ingredientId, tx)
            }
            return conversionContext
        }

        if (!existing) {
            const unitLeft = requestedUnit ?? await this.resolveFallbackUnit(ingredientId, tx)
            return pantryRepository.createItem(userId, ingredientId, {
                quantity:         data.isInPantry       === true ? (data.quantity ?? 0) : 0,
                shoppingQuantity: data.isInShoppingList === true ? (data.shoppingQuantity ?? data.quantity ?? 0) : 0,
                unitLeft,
                isInPantry:       data.isInPantry       ?? false,
                isInShoppingList: data.isInShoppingList ?? false,
                favorite:         data.favorite,
                isEssential:      data.isEssential,
                isInfinite:       data.isInfinite,
                expirationDate:   data.expirationDate,
                note:             data.note,
            }, tx)
        }

        const existingUnit = (existing.unitLeft ?? requestedUnit ?? await this.resolveFallbackUnit(ingredientId, tx)) as MeasureUnit
        const update: Prisma.UserPantryItemUncheckedUpdateInput = {
            unitLeft:         existingUnit,
            favorite:         data.favorite         !== undefined ? data.favorite         : existing.favorite,
            isEssential:      data.isEssential      !== undefined ? data.isEssential      : existing.isEssential,
            isInfinite:       data.isInfinite       !== undefined ? data.isInfinite       : existing.isInfinite,
            expirationDate:   data.expirationDate   !== undefined
                ? (data.expirationDate ? new Date(data.expirationDate) : null)
                : existing.expirationDate,
            note:             data.note !== undefined ? data.note : existing.note,
        }

        if (data.isInPantry === true) {
            const incoming = data.quantity ?? 0
            const convertedIncoming = requestedUnit && requestedUnit !== existingUnit && incoming > 0
                ? convertOrThrow(
                    incoming,
                    requestedUnit,
                    existingUnit,
                    'pantry quantity',
                    await ensureConversionContext(),
                )
                : incoming

            update.quantity   = existing.quantity + convertedIncoming
            update.isInPantry = true

            if (data.isInShoppingList === false) {
                update.shoppingQuantity = 0
                update.isInShoppingList = false
            }
        }

        if (data.isInShoppingList === true) {
            const incoming = data.shoppingQuantity ?? data.quantity ?? 0
            const convertedIncoming = requestedUnit && requestedUnit !== existingUnit && incoming > 0
                ? convertOrThrow(
                    incoming,
                    requestedUnit,
                    existingUnit,
                    'shopping quantity',
                    await ensureConversionContext(),
                )
                : incoming

            update.shoppingQuantity = (existing.shoppingQuantity ?? 0) + convertedIncoming
            update.isInShoppingList = true
        }

        return pantryRepository.update(existing.id, update, tx)
    }

    /**
     * Move a quantity from the shopping list into the pantry.
     * Race-safe (DB-008): the row is locked with SELECT … FOR UPDATE inside the
     * transaction, so concurrent moves / decrements cannot lose updates.
     */
    async moveToPantry(userId: string, ingredientId: string, amount: number, unitLeft?: MeasureUnit) {
        const item = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`
                SELECT id FROM user_pantry_items
                 WHERE user_id = ${userId} AND ingredient_id = ${ingredientId}
                   FOR UPDATE
            `
            const existing = await pantryRepository.findByUserAndIngredient(userId, ingredientId, tx)
            if (!existing) throw new NotFoundError()

            const previousUnit = (existing.unitLeft ?? unitLeft ?? await this.resolveFallbackUnit(ingredientId, tx)) as MeasureUnit
            const targetUnit = (unitLeft ?? existing.unitLeft ?? previousUnit) as MeasureUnit

            let currentPantryQty = existing.quantity ?? 0
            let currentShoppingQty = existing.shoppingQuantity ?? 0

            if (targetUnit !== previousUnit) {
                const conversionContext = await this.getIngredientConversionContext(ingredientId, tx)
                if (currentPantryQty > 0) {
                    currentPantryQty = convertOrThrow(
                        currentPantryQty,
                        previousUnit,
                        targetUnit,
                        'pantry quantity',
                        conversionContext,
                    )
                }
                if (currentShoppingQty > 0) {
                    currentShoppingQty = convertOrThrow(
                        currentShoppingQty,
                        previousUnit,
                        targetUnit,
                        'shopping quantity',
                        conversionContext,
                    )
                }
            }

            const newPantryQty = Math.max(0, currentPantryQty + amount)
            const remainingShopping = Math.max(0, currentShoppingQty - amount)

            return pantryRepository.update(existing.id, {
                quantity: newPantryQty,
                shoppingQuantity: remainingShopping,
                unitLeft: targetUnit,
                isInPantry: true,
                isInShoppingList: remainingShopping > 0,
            }, tx)
        })
        await invalidateMakeableCache(userId)
        return item
    }

    async update(id: string, data: Prisma.UserPantryItemUpdateInput) {
        const normalized: Prisma.UserPantryItemUpdateInput = { ...data }
        if (data.isInShoppingList === false) {
            normalized.shoppingQuantity = 0
        }

        const item = await pantryRepository.update(id, normalized)
        if (!item) throw new NotFoundError('Pantry item not found')
        await invalidateMakeableCache(item.userId)
        return item
    }

    async delete(id: string) {
        const item = await pantryRepository.findById(id)
        if (!item) throw new NotFoundError('Pantry item not found')
        const ok = await pantryRepository.hardDelete(id)
        if (!ok) throw new NotFoundError('Pantry item not found')
        await invalidateMakeableCache(item.userId)
    }

    async addItemsBulk(
        userId: string,
        items: {
            shoppingQuantity: number;
            ingredientId: string; destination: 'shopping' | 'pantry'; quantity: number; unit: string }[],
    ) {
        if (items.length === 0) return { addedToShopping: 0, addedToPantry: 0 }

        // DB-012: one transaction for the whole batch (instead of one per item)
        // and a single cache invalidation.
        const counts = await withSerializableRetry(async (tx) => {
            let addedToShopping = 0
            let addedToPantry   = 0
            for (const ing of items) {
                if (ing.destination === 'shopping') {
                    await this.upsertInTx(tx, userId, ing.ingredientId, {
                        quantity:         ing.quantity,
                        shoppingQuantity: ing.shoppingQuantity,
                        unitLeft:         ing.unit,
                        isInPantry:       false,
                        isInShoppingList: true,
                    })
                    addedToShopping++
                } else {
                    await this.upsertInTx(tx, userId, ing.ingredientId, {
                        quantity:         ing.quantity,
                        unitLeft:         ing.unit,
                        isInPantry:       true,
                        isInShoppingList: false,
                    })
                    addedToPantry++
                }
            }
            return { addedToShopping, addedToPantry }
        }, { retryOnCodes: ['P2002'] })

        await invalidateMakeableCache(userId)
        return counts
    }

    async importDemoBar(userId: string, ingredientIds: string[]): Promise<{ imported: number }> {
        const uniqueIds = [...new Set(ingredientIds)]
        if (uniqueIds.length === 0) return { imported: 0 }

        const imported = await pantryRepository.importIngredientsIntoEmptyPantry(userId, uniqueIds)
        if (imported > 0) await invalidateMakeableCache(userId)
        return { imported }
    }

    assertOwnership(item: { userId: string }, userId: string, isAdmin: boolean) {
        if (item.userId !== userId && !isAdmin) {
            throw new ForbiddenError('You can only access your own pantry items')
        }
    }
}

export const pantryService = new PantryService()
