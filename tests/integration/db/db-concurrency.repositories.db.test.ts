/**
 * DB integration tests for the data-integrity fixes (DB-001 … DB-008, DB-003).
 * Run with `npm run test:db` (requires TEST_DATABASE_URL with all migrations applied).
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { pantryRepository } from '@/repositories/pantry.repository'
import { ratingRepository } from '@/repositories/rating.repository'
import { plannedCollectionRepository } from '@/repositories/planned-collection.repository'
import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { plannedCollectionService } from '@/services/planned-collection.service'
import { favoriteService } from '@/services/favorite.service'
import { ingredientService } from '@/services/ingredient.service'
import { cocktailService } from '@/services/cocktail.service'
import { invalidateDerivationCache } from '@/lib/derivations/derivation-cache'
import { ConflictError } from '@/utils/errors'
import {
    createCocktail,
    createIngredient,
    createUser,
    ensureTestDatabaseUrl,
    resetDatabase,
} from './harness'

const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip

async function addRecipe(cocktailId: string, ingredientId: string, amount: number, unit: 'cl' | 'ml' = 'cl') {
    return prisma.cocktailIngredient.create({ data: { cocktailId, ingredientId, amount, unit } })
}

async function stock(userId: string, ingredientId: string, quantity: number) {
    return prisma.userPantryItem.create({
        data: { userId, ingredientId, quantity, unitLeft: 'cl', isInPantry: true },
    })
}

describeDb('DB integration: concurrency & integrity', () => {
    beforeAll(() => {
        ensureTestDatabaseUrl()
    })

    beforeEach(async () => {
        await resetDatabase()
        invalidateDerivationCache()
    })

    it('DB-001: two parallel decrements never lose a deduction', async () => {
        const user = await createUser()
        const gin = await createIngredient()
        const item = await stock(user.id, gin.id, 70)

        const usage = [{ ingredientId: gin.id, amount: 6, unit: 'cl' }]
        await Promise.all([
            pantryRepository.decrementForCocktail(user.id, usage),
            pantryRepository.decrementForCocktail(user.id, usage),
        ])

        const after = await prisma.userPantryItem.findUniqueOrThrow({ where: { id: item.id } })
        expect(after.quantity).toBe(58)
    })

    it('DB-002: two parallel completions create exactly one made-log and one deduction', async () => {
        const user = await createUser()
        const gin = await createIngredient()
        const cocktail = await createCocktail()
        await addRecipe(cocktail.id, gin.id, 6)
        const item = await stock(user.id, gin.id, 70)
        const planned = await prisma.plannedCocktail.create({
            data: { userId: user.id, cocktailId: cocktail.id, plannedFor: new Date(), quantity: 1 },
        })

        const results = await Promise.allSettled([
            plannedCocktailService.complete(planned.id),
            plannedCocktailService.complete(planned.id),
        ])

        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
        const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
        expect(rejected.reason).toBeInstanceOf(ConflictError)

        expect(await prisma.cocktailMadeLog.count({ where: { userId: user.id } })).toBe(1)
        const after = await prisma.userPantryItem.findUniqueOrThrow({ where: { id: item.id } })
        expect(after.quantity).toBe(64)
    })

    it('DB-002: completing one collection cocktail twice deducts once', async () => {
        const user = await createUser()
        const gin = await createIngredient()
        const cocktail = await createCocktail()
        await addRecipe(cocktail.id, gin.id, 5)
        const item = await stock(user.id, gin.id, 50)
        const collection = await plannedCollectionRepository.createWithCocktails(user.id, {
            title: 'Party', plannedFor: new Date(), servings: 2, cocktailIds: [cocktail.id],
        })

        const results = await Promise.allSettled([
            plannedCollectionService.completeCocktail(collection.id, cocktail.id),
            plannedCollectionService.completeCocktail(collection.id, cocktail.id),
        ])

        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
        const after = await prisma.userPantryItem.findUniqueOrThrow({ where: { id: item.id } })
        expect(after.quantity).toBe(40)
        const refreshed = await prisma.plannedCollection.findUniqueOrThrow({ where: { id: collection.id } })
        expect(refreshed.status).toBe('done')
    })

    it('DB-006: 10 parallel ratings keep rating_count exact', async () => {
        const cocktail = await createCocktail()
        const users = await Promise.all(Array.from({ length: 10 }, () => createUser()))

        await Promise.all(users.map((u, i) => ratingRepository.upsert(
            { userId_cocktailId: { userId: u.id, cocktailId: cocktail.id } },
            { userId: u.id, cocktailId: cocktail.id, rating: (i % 5) + 1 },
            { rating: (i % 5) + 1 },
        )))

        const row = await prisma.cocktail.findUniqueOrThrow({ where: { id: cocktail.id } })
        expect(row.ratingCount).toBe(10)
        expect(row.avgRating).toBeCloseTo(3, 5)
    })

    it('DB-006: the database rejects ratings outside 1..5', async () => {
        const user = await createUser()
        const cocktail = await createCocktail()
        await expect(prisma.rating.create({ data: { userId: user.id, cocktailId: cocktail.id, rating: 6 } }))
            .rejects.toThrow()
    })

    it('DB-005: duplicate favorite adds are idempotent (no 500)', async () => {
        const user = await createUser()
        const cocktail = await createCocktail()

        await Promise.all([
            favoriteService.add(user.id, cocktail.id),
            favoriteService.add(user.id, cocktail.id),
            favoriteService.add(user.id, cocktail.id),
        ])

        expect(await prisma.userFavoriteCocktail.count({ where: { userId: user.id } })).toBe(1)
    })

    it('DB-008: a failing collection create leaves no rows behind', async () => {
        const user = await createUser()
        const cocktail = await createCocktail()

        await expect(plannedCollectionRepository.createWithCocktails(user.id, {
            title: 'Broken', plannedFor: new Date(), cocktailIds: [cocktail.id, 'does-not-exist'],
        })).rejects.toBeDefined()

        expect(await prisma.plannedCollection.count()).toBe(0)
        expect(await prisma.plannedCollectionCocktail.count()).toBe(0)
    })

    it('DB-008: concurrent RSVPs from the same user produce a single row', async () => {
        const host = await createUser()
        const guest = await createUser()
        const collection = await plannedCollectionRepository.createWithCocktails(host.id, {
            title: 'Invite', plannedFor: new Date(),
        })
        await plannedCollectionRepository.setShareToken(collection.id, 'share-token-1', true)

        const rsvp = { name: 'Guest', status: 'going' as const, guestCount: 1, userId: guest.id }
        const results = await Promise.allSettled([
            plannedCollectionService.addRsvp('share-token-1', rsvp),
            plannedCollectionService.addRsvp('share-token-1', { ...rsvp, guestCount: 2 }),
        ])

        // An upsert race can still surface one P2002 (mapped to 409 by the API); never two rows.
        expect(results.some((r) => r.status === 'fulfilled')).toBe(true)
        expect(await prisma.collectionRsvp.count({ where: { collectionId: collection.id, userId: guest.id } })).toBe(1)
    })

    it('DB-008: concurrent move-to-pantry keeps both increments', async () => {
        const { pantryService } = await import('@/services/pantry.service')
        const user = await createUser()
        const lime = await createIngredient()
        const item = await prisma.userPantryItem.create({
            data: {
                userId: user.id, ingredientId: lime.id, quantity: 10, unitLeft: 'cl',
                isInPantry: true, isInShoppingList: true, shoppingQuantity: 20,
            },
        })

        await Promise.all([
            pantryService.moveToPantry(user.id, lime.id, 5),
            pantryService.moveToPantry(user.id, lime.id, 5),
        ])

        const after = await prisma.userPantryItem.findUniqueOrThrow({ where: { id: item.id } })
        expect(after.quantity).toBe(20)
        expect(after.shoppingQuantity).toBe(10)
    })

    it('DB-004: deleting a referenced ingredient is refused and changes nothing', async () => {
        const user = await createUser()
        const gin = await createIngredient()
        const cocktail = await createCocktail()
        await addRecipe(cocktail.id, gin.id, 5)
        await stock(user.id, gin.id, 10)

        await expect(ingredientService.delete(gin.id)).rejects.toBeInstanceOf(ConflictError)
        // The FK itself is RESTRICT, even when bypassing the service check.
        await expect(prisma.ingredient.delete({ where: { id: gin.id } }))
            .rejects.toMatchObject({ code: 'P2003' })

        expect(await prisma.cocktailIngredient.count({ where: { ingredientId: gin.id } })).toBe(1)
        expect(await prisma.userPantryItem.count({ where: { ingredientId: gin.id } })).toBe(1)
    })

    it('DB-003: a fully makeable cocktail is found among > 800 partially matching ones, deterministically', async () => {
        const user = await createUser()
        const gin = await createIngredient()
        const vermouth = await createIngredient()
        await stock(user.id, gin.id, 1000)

        const fillerIds = Array.from({ length: 850 }, (_, i) => `filler-${String(i).padStart(4, '0')}`)
        await prisma.cocktail.createMany({
            data: fillerIds.map((id) => ({
                id, name: `Filler ${id}`, instructions: [], technique: [], flavors: [], occasions: [],
            })),
        })
        await prisma.cocktailIngredient.createMany({
            data: fillerIds.flatMap((cocktailId) => [
                { cocktailId, ingredientId: gin.id, amount: 5, unit: 'cl' as const },
                { cocktailId, ingredientId: vermouth.id, amount: 3, unit: 'cl' as const },
            ]),
        })
        const target = await createCocktail()
        await addRecipe(target.id, gin.id, 5)

        const fullOnly = await cocktailService.getMakeable(user.id, 0)
        expect(fullOnly.map((c) => c.id)).toEqual([target.id])

        const first = await cocktailService.getMakeable(user.id, 1)
        const second = await cocktailService.getMakeable(user.id, 1)
        expect(first[0].id).toBe(target.id)
        expect(first).toHaveLength(200)
        expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id))
    })
})
