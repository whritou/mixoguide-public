import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import { findFulfillingIngredient, getDerivableAmount, convertUnit, getIngredientCatalog, type DerivationMap } from '@/lib/derivations/derivation-cache'
import { isBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'
import { toArchivedCocktailJson } from '@/lib/cocktails/cocktailMadeLogArchive'
import { Prisma, type Cocktail, type MeasureUnit } from '@prisma/client'

type MakeableCocktailRow = {
    id: string; name: string; description: string | null; imageUrl: string | null;
    isAlcoholic: boolean | null; source: string;
    difficulty: string; preparationTime: number | null; flavors: string[];
    occasions: string[]; technique: string[]; origin: string | null;
    glassId: string | null; mainAlcoholId: string | null;
    avgRating: number | null; ratingCount: number; createdAt: Date;
    ingredients: {
        ingredientId: string; amount: number | null; unit: string | null;
        optional: boolean; substitutes: string[];
        ingredient: {
            id: string; name: string;
            isAlcoholic: boolean | null;
            type: { name: string } | null;
            subType: { name: string } | null;
        };
    }[]
}

type IngredientMeta = {
    id: string
    name: string
    isAlcoholic: boolean | null
    type: { name: string } | null
    subType: { name: string } | null
}

type PantryQuantities = Map<string, { quantity: number; unit: string; isInfinite?: boolean }>

type PantryMakeableRow = {
    ingredientId: string
    quantity: number | null
    unitLeft: string | null
    isInfinite: boolean
}

/** Max cocktails hydrated per query while evaluating makeable candidates. */
const MAKEABLE_HYDRATE_CHUNK = 500

function isNotFoundError(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'
}

class CocktailRepository extends BaseRepository<
  Cocktail,
  Prisma.CocktailCreateInput,
  Prisma.CocktailUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.cocktail)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'cocktail',
            allowedSortFields: ['name', 'difficulty', 'preparationTime', 'createdAt', 'updatedAt', 'avgRating', 'ratingCount'],
            allowedFilters:    ['source', 'difficulty', 'isAlcoholic', 'glassId', 'mainAlcoholId', 'flavors', 'occasions', 'technique'],
            arrayFields:       ['flavors', 'occasions', 'technique'],
            allowedIncludes:   [
                'glass',
                'mainAlcohol',
                'ingredients',
                'ingredients.type',
                'ingredients.subType',
                'barTools',
                // 'favoritedBy' intentionally NOT allowed: it reaches user rows (SEC-001).
            ],
            searchFields:      ['name', 'description', 'origin'],
            defaultSortField:  'name',
            defaultOrderBy:    [{ avgRating: { sort: 'desc', nulls: 'last' } }, { ratingCount: 'desc' }, { name: 'asc' }],
            softDelete:        false,
        }
    }

    static readonly defaultSelect = {
        id:              true,
        name:            true,
        description:     true,
        imageUrl:        true,
        isAlcoholic:     true,
        source:          true,
        difficulty:      true,
        preparationTime: true,
        flavors:         true,
        occasions:       true,
        technique:       true,
        origin:          true,
        glassId:         true,
        mainAlcoholId:   true,
        avgRating:       true,
        ratingCount:     true,
        createdAt:       true,
        // fullDescription: false
        // instructions: false
    }

    static readonly recommendationSelect = {
        id: true,
        name: true,
        imageUrl: true,
        difficulty: true,
        avgRating: true,
        ratingCount: true,
        preparationTime: true,
        flavors: true,
        mainAlcoholId: true,
    } as const

    static readonly makeableSelect = {
        ...CocktailRepository.defaultSelect,
        ingredients: {
            select: {
                ingredientId: true,
                amount: true,
                unit: true,
                optional: true,
                substitutes: true,
                ingredient: {
                    select: {
                        id: true,
                        name: true,
                        isAlcoholic: true,
                        type: { select: { name: true } },
                        subType: { select: { name: true } },
                    },
                },
            },
        },
    } as const

    async findPantryItemsForMakeable(userId: string): Promise<PantryMakeableRow[]> {
        return prisma.userPantryItem.findMany({
            where: { userId, isInPantry: true },
            select: { ingredientId: true, quantity: true, unitLeft: true, isInfinite: true },
        })
    }

    async findWithIngredients(id: string) {
        return prisma.cocktail.findUnique({
            where: { id },
            include: {
                ingredients: {
                    include: {
                        ingredient: {
                            select: {
                                id: true,
                                name: true,
                                isAlcoholic: true,
                                type: { select: { name: true } },
                                subType: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        })
    }

    async findWithFullDetails(id: string) {
        return prisma.cocktail.findUnique({
            where: { id },
            include: {
                glass: {
                    select: { id: true, name: true,},
                },
                mainAlcohol: {
                    select: { id: true, name: true },
                },
                ingredients: {
                    include: {
                        ingredient: {
                            select: {
                                id: true, name: true, isAlcoholic: true, abv: true,
                                type: { select: { name: true } },
                                subType: { select: { name: true } },
                            },
                        },
                    },
                },
                barTools: {
                    include: {
                        barTool: {
                            select: {
                                id: true, name: true, isEssential: true
                            }
                        },
                    }
                },
                _count: {
                    select: { ratings: true, favoritedBy: true },
                },
            },
        })
    }

    async deletePreservingMadeLogStats(id: string): Promise<boolean> {
        const cocktail = await prisma.cocktail.findUnique({
            where: { id },
            select: { id: true, name: true, imageUrl: true, difficulty: true },
        })

        if (!cocktail) return false

        try {
            await prisma.$transaction(async (tx) => {
                await tx.cocktailMadeLog.updateMany({
                    where: { cocktailId: id },
                    data: { archivedCocktail: toArchivedCocktailJson(cocktail) },
                })
                await tx.cocktail.delete({ where: { id } })
            })
            return true
        } catch (err) {
            if (isNotFoundError(err)) return false
            throw err
        }
    }

    async syncBarTools(cocktailId: string, barToolIds: string[]) {
        await prisma.$transaction([
            prisma.cocktailBarTool.deleteMany({ where: { cocktailId } }),
            prisma.cocktailBarTool.createMany({
                data: barToolIds.map((barToolId) => ({ cocktailId, barToolId })),
                skipDuplicates: true,
            }),
        ])
    }

    async syncIngredients(
        cocktailId: string,
        ingredients: Array<{
            ingredientId: string
            amount?: number
            unit?: string
            optional?: boolean
            substitutes?: string[]
        }>
    ) {
        await prisma.$transaction([
            prisma.cocktailIngredient.deleteMany({ where: { cocktailId } }),
            prisma.cocktailIngredient.createMany({
                data: ingredients.map((i) => ({
                    cocktailId,
                    ingredientId: i.ingredientId,
                    amount: i.amount,
                    unit: i.unit as MeasureUnit | undefined,
                    optional: i.optional,
                    substitutes: i.substitutes ?? [],
                })),
                skipDuplicates: true,
            }),
        ])
    }

    async findTopRatedByIds(cocktailIds: string[], limit = 6) {
        if (cocktailIds.length === 0) return []
        return prisma.cocktail.findMany({
            where: { id: { in: cocktailIds } },
            select: CocktailRepository.recommendationSelect,
            orderBy: { avgRating: 'desc' },
            take: limit,
        })
    }

    async findSimilarToFavorites(
        excludedIds: string[],
        favoriteFlavors: string[],
        favoriteAlcoholIds: string[],
        limit = 6,
    ) {
        const orClauses: object[] = []
        if (favoriteFlavors.length > 0) orClauses.push({ flavors: { hasSome: favoriteFlavors } })
        if (favoriteAlcoholIds.length > 0) orClauses.push({ mainAlcoholId: { in: favoriteAlcoholIds } })
        if (orClauses.length === 0) return []

        return prisma.cocktail.findMany({
            where: {
                id: { notIn: excludedIds },
                OR: orClauses,
            },
            select: CocktailRepository.recommendationSelect,
            orderBy: { avgRating: 'desc' },
            take: limit,
        })
    }

  async findMakeable(
      userIngredientIds: string[],
      maxMissing = 3,
      derivationMap?: DerivationMap,
      resultLimit = 200,
      pantryQuantities?: PantryQuantities,
  ) {
    // Short-circuit: empty pantry can never produce makeable cocktails
    if (userIngredientIds.length === 0) return []

    const userIdSet = new Set(userIngredientIds)
    const dm: DerivationMap = derivationMap ?? new Map()

    // Build the full set of ingredient IDs the user can satisfy (direct + derived).
    // Coverage (direct, derived or via substitutes) is then computed in SQL and
    // only qualifying cocktails are hydrated (DB-003 / BPERF-001).
    const satisfiableIds = new Set(userIngredientIds)
    for (const [derivedId, entries] of dm.entries()) {
      if (entries.some(e => userIdSet.has(e.baseIngredientId))) {
        satisfiableIds.add(derivedId)
      }
    }

    const catalog = await getIngredientCatalog()
    const candidates = await this.findMakeableCandidateIds(Array.from(satisfiableIds), catalog.nonBlockingIds, maxMissing)
    if (candidates.length === 0) return []

    const ingredientMetaMap = catalog.byId as Map<string, IngredientMeta>
    const nameMap = new Map(Array.from(catalog.byId.values(), (i) => [i.id, i.name]))

    // Candidates are ordered by their existence-based missing count, which is a
    // lower bound of the final (quantity-aware) missing count. Process them level
    // by level and stop once `resultLimit` results with missingCount <= level are
    // known: no later candidate can rank above them. This keeps the hydration
    // small while returning exactly the top results, deterministically.
    const levels = new Map<number, string[]>()
    for (const c of candidates) {
      const list = levels.get(c.missing)
      if (list) list.push(c.id)
      else levels.set(c.missing, [c.id])
    }

    type Evaluated = ReturnType<CocktailRepository['evaluateCoverage']>
    const results: Evaluated[] = []
    for (const level of [...levels.keys()].sort((a, b) => a - b)) {
      const ids = levels.get(level)!
      for (let i = 0; i < ids.length; i += MAKEABLE_HYDRATE_CHUNK) {
        const chunk = ids.slice(i, i + MAKEABLE_HYDRATE_CHUNK)
        const cocktails = (await prisma.cocktail.findMany({
          where: { id: { in: chunk } },
          select: CocktailRepository.makeableSelect,
        })) as MakeableCocktailRow[]
        for (const cocktail of cocktails) {
          const evaluated = this.evaluateCoverage(cocktail, userIdSet, dm, nameMap, ingredientMetaMap, pantryQuantities)
          if (evaluated.missingCount <= maxMissing && evaluated.requiredCount > 0 && evaluated.satisfiedCount > 0) {
            results.push(evaluated)
          }
        }
      }
      if (results.filter((r) => r.missingCount <= level).length >= resultLimit) break
    }

    const order: Record<string, number> = { full: 0, withDerivates: 1, withSubstitutes: 2, missing: 3 }
    return results
      .sort((a, b) =>
        order[a.makeableStatus] - order[b.makeableStatus] ||
        a.missingCount - b.missingCount ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
      )
      .slice(0, resultLimit)
  }

  /**
   * Set coverage computed in SQL (DB-003): for every cocktail, count its blocking
   * ingredients and how many of them the user can cover (directly, via a
   * derivation, or via a substitute — existence only). Returns the ids whose
   * uncovered count is <= maxMissing, ordered by that count then id.
   *
   * "Blocking" mirrors `isBlockingCocktailIngredient`: row-level rules (optional,
   * no amount, twist/zest/slice unit) are evaluated here; ingredient-level rules
   * (garnish types, peels, wedges…) come pre-computed as `nonBlockingIds`.
   */
  async findMakeableCandidateIds(
      satisfiableIds: string[],
      nonBlockingIds: string[],
      maxMissing: number,
  ): Promise<Array<{ id: string; missing: number }>> {
    if (satisfiableIds.length === 0) return []
    const missingCap = Math.max(0, Math.floor(maxMissing))
    return prisma.$queryRaw<Array<{ id: string; missing: number }>>(Prisma.sql`
      SELECT cov.cocktail_id AS id, (cov.required - cov.covered)::int AS missing
        FROM (
          SELECT ci.cocktail_id,
                 count(*) FILTER (WHERE b.blocking) AS required,
                 count(*) FILTER (
                   WHERE b.blocking
                     AND (ci.ingredient_id = ANY(${satisfiableIds}::text[])
                          OR ci.substitutes && ${satisfiableIds}::text[])
                 ) AS covered
            FROM cocktail_ingredients ci
            CROSS JOIN LATERAL (
              SELECT (NOT ci.optional
                      AND ci.amount IS NOT NULL
                      AND ci.unit::text NOT IN ('twist', 'zest', 'slice')
                      AND NOT (ci.ingredient_id = ANY(${nonBlockingIds}::text[]))) AS blocking
            ) b
           GROUP BY ci.cocktail_id
        ) cov
       WHERE cov.required > 0
         AND cov.covered > 0
         AND cov.required - cov.covered <= ${missingCap}
       ORDER BY missing, cov.cocktail_id
    `)
  }

  async findMakeableTarget(
      cocktailId: string,
      userIngredientIds: string[],
      derivationMap: DerivationMap,
  ): Promise<{ requiredCount: number; missing: { id: string; name: string }[] } | null> {
    const cocktail = (await prisma.cocktail.findUnique({
      where: { id: cocktailId },
      select: CocktailRepository.makeableSelect,
    })) as MakeableCocktailRow | null
    if (!cocktail) return null
    const coverage = this.evaluateCoverage(cocktail, new Set(userIngredientIds), derivationMap)
    return { requiredCount: coverage.requiredCount, missing: coverage.missingIngredients }
  }

  private evaluateCoverage(
      cocktail: MakeableCocktailRow,
      userIdSet: Set<string>,
      dm: DerivationMap,
      nameMap: Map<string, string> = new Map(),
      ingredientMetaMap: Map<string, IngredientMeta> = new Map(),
      pantryQuantities?: PantryQuantities,
  ) {
    const subMap = nameMap
    const baseNameMap = nameMap
          const required = cocktail.ingredients.filter(isBlockingCocktailIngredient)
          const requiredCount = required.length
          let missingCount = 0
        const missingIngredients: { id: string; name: string }[] = []
        const substituteIngredients: { id: string; name: string }[] = []
        const derivedIngredients: { id: string; name: string; fromId: string; fromName: string }[] = []
          let satisfiedCount = 0

        for (const ing of required) {
          // 1. Direct match
            if (userIdSet.has(ing.ingredientId)) {
                if (pantryQuantities && ing.amount != null && ing.unit) {
                    const pantryItem = pantryQuantities.get(ing.ingredientId)

                    if (pantryItem) {
                        if (pantryItem.isInfinite) {
                            satisfiedCount++
                            continue
                        }
                        const available = convertUnit(
                            pantryItem.quantity,
                            pantryItem.unit,
                            ing.unit,
                            {
                                ingredientName: ing.ingredient.name,
                                typeName: ing.ingredient.type?.name,
                                subTypeName: ing.ingredient.subType?.name,
                                isAlcoholic: ing.ingredient.isAlcoholic,
                            }
                        )

                        if (available !== null && available >= ing.amount) {
                            satisfiedCount++
                        } else {
                            missingCount++
                            missingIngredients.push({ id: ing.ingredientId, name: ing.ingredient.name })
                        }
                    } else {
                        missingCount++
                        missingIngredients.push({ id: ing.ingredientId, name: ing.ingredient.name })
                    }
                } else {
                    // fallback (no quantity info)
                    satisfiedCount++
                }
                continue
            }

          // 2. Check derivation: can a pantry item produce this ingredient?
          const derivedFrom = findFulfillingIngredient(userIdSet, ing.ingredientId, dm)
          if (derivedFrom && derivedFrom !== ing.ingredientId) {
              if (pantryQuantities && ing.amount != null && ing.unit) {
                  const baseItem = pantryQuantities.get(derivedFrom)
                  if (baseItem) {
                      if (baseItem.isInfinite) {
                          satisfiedCount++
                          derivedIngredients.push({
                              id: ing.ingredientId,
                              name: ing.ingredient.name,
                              fromId: derivedFrom,
                              fromName: baseNameMap.get(derivedFrom) ?? derivedFrom,
                          })
                          continue
                      }
                      const derivable = getDerivableAmount(derivedFrom, ing.ingredientId, baseItem.quantity, dm)
                      if (derivable) {
                          const requiredInYieldUnit = convertUnit(ing.amount, ing.unit, derivable.unit as string, {
                              ingredientName: ing.ingredient.name,
                              typeName: ing.ingredient.type?.name,
                              subTypeName: ing.ingredient.subType?.name,
                              isAlcoholic: ing.ingredient.isAlcoholic,
                          })
                          if (requiredInYieldUnit !== null && derivable.amount >= requiredInYieldUnit) {
                              satisfiedCount++
                              derivedIngredients.push({
                                  id: ing.ingredientId,
                                  name: ing.ingredient.name,
                                  fromId: derivedFrom,
                                  fromName: baseNameMap.get(derivedFrom) ?? derivedFrom,
                              })
                          } else {
                              missingCount++
                              missingIngredients.push({ id: ing.ingredientId, name: ing.ingredient.name })
                          }
                          continue
                      }
                  }
              }
              // Fallback: no quantity info — existence-based check (backwards-compatible)
              satisfiedCount++
              derivedIngredients.push({
                  id: ing.ingredientId,
                  name: ing.ingredient.name,
                  fromId: derivedFrom,
                  fromName: baseNameMap.get(derivedFrom) ?? derivedFrom,
              })
              continue
          }

          // 3. Check substitutes
            let usedSubId: string | undefined

            for (const subId of ing.substitutes) {
                if (!userIdSet.has(subId)) continue

                if (pantryQuantities && ing.amount != null && ing.unit) {
                    const pantryItem = pantryQuantities.get(subId)
                    if (pantryItem) {
                        if (pantryItem.isInfinite) {
                            usedSubId = subId
                            break
                        }
                        const available = convertUnit(
                            pantryItem.quantity,
                            pantryItem.unit,
                            ing.unit,
                            {
                                ingredientName: ingredientMetaMap.get(subId)?.name ?? ing.ingredient.name,
                                typeName: ingredientMetaMap.get(subId)?.type?.name ?? ing.ingredient.type?.name,
                                subTypeName: ingredientMetaMap.get(subId)?.subType?.name ?? ing.ingredient.subType?.name,
                                isAlcoholic: ingredientMetaMap.get(subId)?.isAlcoholic ?? ing.ingredient.isAlcoholic,
                            }
                        )

                        if (available !== null && available >= ing.amount) {
                            usedSubId = subId
                            break
                        }
                    }
                } else {
                    usedSubId = subId
                    break
                }
            }
          if (usedSubId) {
              satisfiedCount++
            substituteIngredients.push({ id: usedSubId, name: subMap.get(usedSubId) ?? usedSubId })
            continue
          }

          // 4. Check if a substitute can be derived
          let foundDerivedSub = false
          for (const subId of ing.substitutes) {
            const subDerivedFrom = findFulfillingIngredient(userIdSet, subId, dm)
            if (subDerivedFrom) {
              substituteIngredients.push({ id: subId, name: subMap.get(subId) ?? subId })
              foundDerivedSub = true
              break
            }
          }
          if (foundDerivedSub){
              satisfiedCount++
              continue
          }

          // 5. Missing
          missingCount++
          missingIngredients.push({ id: ing.ingredientId, name: ing.ingredient.name })
        }

          const makeableStatus =
              missingCount === 0 && substituteIngredients.length === 0 && derivedIngredients.length === 0
                  ? 'full'
                  : missingCount === 0 && substituteIngredients.length === 0 && derivedIngredients.length > 0
                      ? 'withDerivates'
                      : missingCount === 0
                          ? 'withSubstitutes'
                          : 'missing'

        const { ingredients: _ingredients, ...rest } = cocktail
          return {
              ...rest,
              makeableStatus,
              missingCount,
              requiredCount,
              satisfiedCount,
              missingIngredients,
              substituteIngredients,
              derivedIngredients,
          }
  }
}

export const cocktailRepository = new CocktailRepository()
