import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { favoriteRepository } from '@/repositories/favorite.repository'
import { pantryRepository } from '@/repositories/pantry.repository'
import { plannedCocktailRepository } from '@/repositories/planned-cocktail.repository'
import { plannedCollectionRepository } from '@/repositories/planned-collection.repository'
import { ratingRepository } from '@/repositories/rating.repository'
import { prisma } from '@/lib/db/prisma'
import {
    createCocktail,
    createIngredient,
    createUser,
    ensureTestDatabaseUrl,
    resetDatabase,
} from './harness'

const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip

describeDb('DB integration: core domain repositories', () => {
    beforeAll(() => {
        ensureTestDatabaseUrl()
    })

    beforeEach(async () => {
        await resetDatabase()
    })

    it('supports pantry create/find/update workflows', async () => {
        const user = await createUser()
        const ingredient = await createIngredient()

        const created = await pantryRepository.createItem(user.id, ingredient.id, {
            quantity: 50,
            unitLeft: 'ml',
            isInPantry: true,
            isInShoppingList: false,
        })
        expect(created.userId).toBe(user.id)

        const found = await pantryRepository.findByUserAndIngredient(user.id, ingredient.id)
        expect(found?.id).toBe(created.id)

        const updated = await pantryRepository.update(created.id, {
            quantity: 70,
            shoppingQuantity: 5,
        })
        expect(updated?.quantity).toBe(70)
        expect(updated?.shoppingQuantity).toBe(5)
    })

    it('upserts planned cocktails for one user/cocktail pair', async () => {
        const user = await createUser()
        const cocktail = await createCocktail()

        const first = await plannedCocktailRepository.upsertPlanned({
            userId: user.id,
            cocktailId: cocktail.id,
            plannedFor: new Date('2026-06-01T18:00:00.000Z'),
            quantity: 1,
        })

        const second = await plannedCocktailRepository.upsertPlanned({
            userId: user.id,
            cocktailId: cocktail.id,
            plannedFor: new Date('2026-06-02T18:00:00.000Z'),
            quantity: 3,
        })

        expect(second.id).toBe(first.id)
        expect(second.quantity).toBe(3)
        expect(second.status).toBe('planned')

        const exists = await plannedCocktailRepository.findByUserAndCocktail(user.id, cocktail.id)
        expect(exists?.id).toBe(first.id)
    })

    it('creates planned collections and manages collection cocktails', async () => {
        const user = await createUser()
        const cocktailA = await createCocktail()
        const cocktailB = await createCocktail()

        const created = await plannedCollectionRepository.createWithCocktails(user.id, {
            title: 'Friday Party',
            plannedFor: new Date('2026-06-05T19:00:00.000Z'),
            servings: 4,
            occasions: ['party'],
            cocktailIds: [cocktailA.id],
        })

        expect(created?.cocktails).toHaveLength(1)

        const collectionId = created!.id
        const hasA = await plannedCollectionRepository.hasCocktail(collectionId, cocktailA.id)
        expect(hasA).toBe(true)

        await plannedCollectionRepository.addCocktail(collectionId, cocktailB.id)
        const hasB = await plannedCollectionRepository.hasCocktail(collectionId, cocktailB.id)
        expect(hasB).toBe(true)

        await plannedCollectionRepository.removeCocktail(collectionId, cocktailB.id)
        const hasBAfterDelete = await plannedCollectionRepository.hasCocktail(collectionId, cocktailB.id)
        expect(hasBAfterDelete).toBe(false)

        const shared = await plannedCollectionRepository.setShareToken(collectionId, 'share-token-1', true)
        expect(shared.shareEnabled).toBe(true)
        expect(shared.shareToken).toBe('share-token-1')
    })

    it('queries favorites by user and cocktail', async () => {
        const user = await createUser()
        const cocktail = await createCocktail()

        await prisma.userFavoriteCocktail.create({
            data: { userId: user.id, cocktailId: cocktail.id },
        })

        const favorite = await favoriteRepository.findByUserAndCocktail(user.id, cocktail.id)
        expect(favorite?.cocktailId).toBe(cocktail.id)

        const allByUser = await favoriteRepository.findAllByUser(user.id)
        expect(allByUser).toHaveLength(1)
    })

    it('upserts and deletes ratings while maintaining cached cocktail stats', async () => {
        const user = await createUser()
        const cocktail = await createCocktail()

        const rating = await ratingRepository.upsert(
            { userId_cocktailId: { userId: user.id, cocktailId: cocktail.id } },
            { userId: user.id, cocktailId: cocktail.id, rating: 4 },
            { rating: 4 },
        )
        expect(rating.rating).toBe(4)

        const statsAfterCreate = await ratingRepository.getStatsForCocktail(cocktail.id)
        expect(statsAfterCreate.count).toBe(1)
        expect(statsAfterCreate.average).toBe(4)

        const deleted = await ratingRepository.hardDelete(rating.id)
        expect(deleted).toBe(true)

        const statsAfterDelete = await ratingRepository.getStatsForCocktail(cocktail.id)
        expect(statsAfterDelete.count).toBe(0)
    })
})
