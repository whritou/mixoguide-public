import type { CocktailMadeLog } from '@/types/models/cocktail-made-log'
import { parseArchivedCocktailSnapshot } from '@/lib/cocktails/cocktailMadeLogArchive'

export type CocktailMadeLogDto = {
    id: string
    userId: string
    cocktailId?: string | null
    quantity?: number | null
    madeAt: string
    note?: string | null
    archived?: boolean | null
    archivedCocktail?: unknown
    cocktail?: {
        id: string
        name: string
        imageUrl?: string | null
        difficulty?: string | null
    } | null
}

export function mapCocktailMadeLog(dto: CocktailMadeLogDto): CocktailMadeLog {
    const archivedCocktail = parseArchivedCocktailSnapshot(dto.archivedCocktail)
    const displayCocktail = dto.cocktail ?? archivedCocktail

    return {
        id:         dto.id,
        userId:     dto.userId,
        cocktailId: dto.cocktailId ?? archivedCocktail?.id ?? '',
        quantity:   dto.quantity ?? 1,
        madeAt:     dto.madeAt,
        note:       dto.note ?? null,
        archived:   dto.archived ?? false,
        archivedCocktail,
        isArchivedCocktail: !dto.cocktail && !!archivedCocktail,
        cocktail:   displayCocktail ? {
            id:         displayCocktail.id,
            name:       displayCocktail.name,
            imageUrl:   displayCocktail.imageUrl ?? null,
            difficulty: displayCocktail.difficulty ?? 'easy',
        } : undefined,
    }
}

export function mapCocktailMadeLogs(dtos: CocktailMadeLogDto[]): CocktailMadeLog[] {
    return dtos.map(mapCocktailMadeLog)
}
