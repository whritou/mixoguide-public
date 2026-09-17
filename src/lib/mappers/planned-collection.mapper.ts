import type { PlannedCollectionDTO, PlannedCollection } from '@/types/models/planned-collection'

export function mapPlannedCollection(dto: PlannedCollectionDTO): PlannedCollection {
    return {
        id:          dto.id,
        userId:      dto.userId,
        title:       dto.title,
        location:    dto.location ?? null,
        guestNote:   dto.guestNote ?? null,
        plannedFor:  dto.plannedFor,
        servings:    dto.servings ?? 1,
        occasions:   dto.occasions ?? [],
        status:      dto.status,
        completedAt: dto.completedAt ?? undefined,
        createdAt:   dto.createdAt,
        updatedAt:   dto.updatedAt ?? undefined,
        shareToken:     dto.shareToken ?? null,
        shareEnabled:   dto.shareEnabled ?? false,
        rsvpGoingCount: dto.rsvpGoingCount ?? 0,
        cocktails:   (dto.cocktails ?? []).map(c => ({
            id:          c.id,
            cocktailId:  c.cocktailId,
            status:      c.status,
            completedAt: c.completedAt,
            cocktail:    c.cocktail ? {
                id:         c.cocktail.id,
                name:       c.cocktail.name,
                imageUrl:   c.cocktail.imageUrl ?? undefined,
                difficulty: c.cocktail.difficulty ?? undefined,
                ingredients: c.cocktail.ingredients,
            } : undefined,
        })),
    }
}

export function mapPlannedCollections(dtos: PlannedCollectionDTO[]): PlannedCollection[] {
    return dtos.map(mapPlannedCollection)
}
