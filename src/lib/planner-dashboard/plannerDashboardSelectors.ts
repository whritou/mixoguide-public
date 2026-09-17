import type { CocktailMadeLog } from '@/types/models/cocktail-made-log'
import type { PlannedCocktail } from '@/types/models/planned-cocktail'
import type { PlannedCollection } from '@/types/models/planned-collection'
import { isOverdueDate, parseIsoDate } from '@/lib/planner-dashboard/plannerDateUtils'

export type CocktailDayGroup = {
    key: string
    date: Date
    items: PlannedCocktail[]
}

type SortOrder = 'asc' | 'desc'

function sortByIsoDate<T>(items: T[], getDate: (item: T) => string, sortOrder: SortOrder = 'asc'): T[] {
    return [...items].sort((left, right) => {
        const leftDate = parseIsoDate(getDate(left)).getTime()
        const rightDate = parseIsoDate(getDate(right)).getTime()
        return sortOrder === 'asc' ? leftDate - rightDate : rightDate - leftDate
    })
}

function isPlannedCocktail(item: PlannedCocktail): boolean {
    return item.status === 'planned'
}

function isPlannedCollection(item: PlannedCollection): boolean {
    return item.status === 'planned'
}

export function groupPlannedCocktailsByDay(
    items: PlannedCocktail[],
    sortOrder: SortOrder = 'asc',
): CocktailDayGroup[] {
    const grouped = new Map<string, CocktailDayGroup>()

    for (const item of sortByIsoDate(items, (entry) => entry.plannedFor, sortOrder)) {
        const key = item.plannedFor.split('T')[0]
        if (!grouped.has(key)) {
            grouped.set(key, {
                key,
                date: new Date(`${key}T12:00:00`),
                items: [],
            })
        }
        grouped.get(key)?.items.push(item)
    }

    return Array.from(grouped.values())
}

export function selectSortedMadeLogs(items: CocktailMadeLog[]): CocktailMadeLog[] {
    return sortByIsoDate(items, (item) => item.madeAt, 'desc')
}

export function selectSortedCollectionsByPlannedFor(
    items: PlannedCollection[],
    sortOrder: SortOrder = 'asc',
): PlannedCollection[] {
    return sortByIsoDate(items, (item) => item.plannedFor, sortOrder)
}

export function selectSortedFinishedCollections(items: PlannedCollection[]): PlannedCollection[] {
    return sortByIsoDate(items, (item) => item.completedAt ?? item.plannedFor, 'desc')
}

export function selectUpcomingCocktails(items: PlannedCocktail[], now: Date, limit = 2): PlannedCocktail[] {
    return sortByIsoDate(
        items.filter((item) => isPlannedCocktail(item) && !isOverdueDate(parseIsoDate(item.plannedFor), now)),
        (item) => item.plannedFor,
        'asc',
    ).slice(0, limit)
}

export function selectUpcomingCollections(items: PlannedCollection[], now: Date, limit = 2): PlannedCollection[] {
    return sortByIsoDate(
        items.filter((item) => isPlannedCollection(item) && !isOverdueDate(parseIsoDate(item.plannedFor), now)),
        (item) => item.plannedFor,
        'asc',
    ).slice(0, limit)
}
