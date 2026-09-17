import type { Prisma } from '@prisma/client'

export type ArchivedCocktailSnapshot = {
    id: string
    name: string
    imageUrl: string | null
    difficulty: string | null
}

export type CocktailArchiveSource = ArchivedCocktailSnapshot

export function toArchivedCocktailSnapshot(cocktail: CocktailArchiveSource): ArchivedCocktailSnapshot {
    return {
        id:         cocktail.id,
        name:       cocktail.name,
        imageUrl:   cocktail.imageUrl ?? null,
        difficulty: cocktail.difficulty ?? null,
    }
}

export function toArchivedCocktailJson(cocktail: CocktailArchiveSource): Prisma.InputJsonObject {
    return toArchivedCocktailSnapshot(cocktail) as Prisma.InputJsonObject
}

export function parseArchivedCocktailSnapshot(value: unknown): ArchivedCocktailSnapshot | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null

    const record = value as Record<string, unknown>
    if (typeof record.id !== 'string' || typeof record.name !== 'string') return null

    return {
        id:         record.id,
        name:       record.name,
        imageUrl:   typeof record.imageUrl === 'string' ? record.imageUrl : null,
        difficulty: typeof record.difficulty === 'string' ? record.difficulty : null,
    }
}
