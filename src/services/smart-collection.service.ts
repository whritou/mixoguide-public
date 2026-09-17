import { prisma } from '@/lib/db/prisma'
import {
    SMART_COLLECTIONS,
    getSmartCollection,
    isInSeason,
    type SmartCollectionDefinition,
} from '@/lib/smart-collections'
import { Prisma, type Occasion } from '@prisma/client'
import { NotFoundError } from '@/utils/errors'

/** How many cocktails to show per theme in the list view. */
const COCKTAILS_PER_THEME = 5

/** Thresholds for the "best-marked" bucket. */
const WELL_RATED_MIN_AVG   = 4.0
const WELL_RATED_MIN_VOTES = 3

/** Soft cap on the favorites bucket — never let it crowd the whole card. */
const FAVORITES_MAX_SHARE  = 0.4

export interface SmartCollectionCocktail {
    id:           string
    name:         string
    imageUrl:     string | null
    isAlcoholic:  boolean | null
    difficulty:   string
    avgRating:    number | null
    ratingCount:  number
}

export interface SmartCollectionResult {
    slug:             string
    title:            string
    subtitle:         string
    icon:             SmartCollectionDefinition['icon']
    accent:           SmartCollectionDefinition['accent']
    defaultServings:  number
    defaultDayOffset: number
    occasions:        string[]
    cocktailCount:    number
    cocktails:        SmartCollectionCocktail[]
}

const cocktailSelect = {
    id:           true,
    name:         true,
    imageUrl:     true,
    isAlcoholic: true,
    difficulty:   true,
    avgRating:    true,
    ratingCount:  true,
} satisfies Prisma.CocktailSelect

function buildWhere(def: SmartCollectionDefinition): Prisma.CocktailWhereInput {
    const where: Prisma.CocktailWhereInput = {
        occasions: { hasSome: def.occasions as Occasion[] },
    }
    if (def.isAlcoholic !== undefined) where.isAlcoholic = def.isAlcoholic
    return where
}

/** Fisher–Yates shuffle (in-place), used to pick a random subset deterministically. */
function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

class SmartCollectionService {
    /**
     * Returns every in-season theme with a curated subset of up to
     * {@link COCKTAILS_PER_THEME} cocktails per theme. Out-of-season themes
     * (e.g. Halloween in May) are filtered out.
     *
     * @param userId  When provided, the user's favourite drinks are
     *                preferentially surfaced in each theme.
     */
    async listAll(userId?: string): Promise<SmartCollectionResult[]> {
        const now = new Date()
        const visible = SMART_COLLECTIONS.filter(def => isInSeason(def, now))
        return Promise.all(visible.map(def => this.resolve(def, COCKTAILS_PER_THEME, userId)))
    }

    /**
     * Returns one theme with a curated cocktail list. Resolves regardless of
     * season — direct links and bookmarks must still work outside the
     * in-season window.
     */
    async getBySlug(slug: string, take = COCKTAILS_PER_THEME, userId?: string): Promise<SmartCollectionResult> {
        const def = getSmartCollection(slug)
        if (!def) throw new NotFoundError('Smart collection not found')
        return this.resolve(def, take, userId)
    }

    /**
     * Picks cocktails for one theme in three weighted tiers:
     *
     *   1. **Favourites** — drinks the signed-in user has already starred
     *      that match the theme (capped at 40% of the slots, never crowds the
     *      whole card).
     *   2. **Best-rated** — drinks with `avgRating >= 4` and at least three
     *      votes, shuffled so the same five don't always show up.
     *   3. **Random fill** — anything else matching the theme, fetched with a
     *      random `skip` offset so we don't bias toward the start of the
     *      alphabet when the rest of the rows are unrated.
     */
    private async resolve(
        def: SmartCollectionDefinition,
        take: number,
        userId?: string,
    ): Promise<SmartCollectionResult> {
        const baseWhere = buildWhere(def)
        const total     = await prisma.cocktail.count({ where: baseWhere })

        const picked: SmartCollectionCocktail[] = []
        const seen   = new Set<string>()

        const remember = (rows: SmartCollectionCocktail[]) => {
            for (const r of rows) {
                if (!seen.has(r.id) && picked.length < take) {
                    picked.push(r)
                    seen.add(r.id)
                }
            }
        }

        // ── Tier 1: user favourites in this theme ─────────────────────────
        if (userId) {
            const favCap = Math.max(1, Math.floor(take * FAVORITES_MAX_SHARE))
            const favs = await prisma.cocktail.findMany({
                where: {
                    AND: [baseWhere, { favoritedBy: { some: { userId } } }],
                },
                select: cocktailSelect,
                take:   favCap * 3,  // overfetch for variety
            })
            remember(shuffle([...favs]).slice(0, favCap))
        }

        // ── Tier 2: well-rated cocktails ──────────────────────────────────
        if (picked.length < take) {
            const wellRated = await prisma.cocktail.findMany({
                where: {
                    AND: [
                        baseWhere,
                        seen.size > 0 ? { id: { notIn: Array.from(seen) } } : {},
                        { ratingCount: { gte: WELL_RATED_MIN_VOTES } },
                        { avgRating:   { gte: WELL_RATED_MIN_AVG   } },
                    ],
                },
                select:  cocktailSelect,
                orderBy: [{ avgRating: 'desc' }, { ratingCount: 'desc' }],
                take:    20,
            })
            remember(shuffle([...wellRated]).slice(0, take - picked.length))
        }

        // ── Tier 3: random fill from anything still matching ──────────────
        // Postgres `ORDER BY RANDOM()` gives true uniform sampling — there's
        // no alphabetical or createdAt bias. Prisma's query builder can't
        // express this so we drop to raw SQL for the ID list, then load the
        // full rows through the typed `findMany` below.
        if (picked.length < take) {
            const stillNeeded = take - picked.length
            const seenIds = Array.from(seen)

            const conditions: Prisma.Sql[] = [
                Prisma.sql`occasions && ${def.occasions}::"Occasion"[]`,
            ]
            if (def.isAlcoholic !== undefined) {
                conditions.push(Prisma.sql`is_alcoholic = ${def.isAlcoholic}`)
            }
            if (seenIds.length > 0) {
                conditions.push(Prisma.sql`id NOT IN (${Prisma.join(seenIds)})`)
            }
            const whereClause = Prisma.join(conditions, ' AND ')

            const randomIds = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
                SELECT id FROM cocktails
                WHERE ${whereClause}
                ORDER BY RANDOM()
                LIMIT ${stillNeeded}
            `)

            if (randomIds.length > 0) {
                const fillers = await prisma.cocktail.findMany({
                    where:  { id: { in: randomIds.map(r => r.id) } },
                    select: cocktailSelect,
                })
                remember(fillers)
            }
        }

        return {
            slug:             def.slug,
            title:            def.title,
            subtitle:         def.subtitle,
            icon:             def.icon,
            accent:           def.accent,
            defaultServings:  def.defaultServings,
            defaultDayOffset: def.defaultDayOffset,
            occasions:        def.occasions,
            cocktailCount:    total,
            cocktails:        shuffle(picked),   // randomize final order so favs aren't always first
        }
    }
}

export const smartCollectionService = new SmartCollectionService()
