import { plannedCollectionService } from '@/services/planned-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withPublic } from '@/middlewares/withAuth'

export const GET = withPublic(async (_req, { params }) => {
    const { token } = await params
    const collection = await plannedCollectionService.getPublicView(token)

    return ApiResponse.success({
        id:         collection.id,
        title:      collection.title,
        location:   collection.location,
        guestNote:  collection.guestNote,
        plannedFor: collection.plannedFor,
        servings:   collection.servings,
        occasions:  collection.occasions,
        hostName:   collection.user?.name ?? null,
        cocktails:  collection.cocktails.map((entry) => ({
            id:       entry.cocktail.id,
            name:     entry.cocktail.name,
            imageUrl: entry.cocktail.imageUrl,
            difficulty: entry.cocktail.difficulty,
            ingredients: entry.cocktail.ingredients.map((i) => ({
                name:   i.ingredient.name,
                amount: i.amount,
                unit:   i.unit,
            })),
        })),
        rsvps: collection.rsvps.map((r) => ({
            id:         r.id,
            name:       r.name,
            status:     r.status,
            guestCount: r.guestCount,
            note:       r.note,
            createdAt:  r.createdAt,
        })),
    })
})
