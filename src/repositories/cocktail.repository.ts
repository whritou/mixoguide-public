import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import { findFulfillingIngredient, getDerivableAmount, convertUnit, type DerivationMap } from '@/lib/derivations/derivation-cache'
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
                'favoritedBy',
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
    // This lets us pre-filter cocktails at the SQL level, avoiding a full table scan.
    // Note: cocktails that match *only* via substitute ingredients are an accepted
    // edge-case trade-off — they are vanishingly rare and skipping them avoids
    // loading the entire cocktail table on every request.
    const satisfiableIds = new Set(userIngredientIds)
    for (const [derivedId, entries] of dm.entries()) {
      if (entries.some(e => userIdSet.has(e.baseIngredientId))) {
        satisfiableIds.add(derivedId)
      }
    }

    const cocktails = (await prisma.cocktail.findMany({
      where: {
        // Only load cocktails that have at least one ingredient the user can satisfy
        ingredients: {
          some: { ingredientId: { in: Array.from(satisfiableIds) } },
        },
      },
      select: CocktailRepository.makeableSelect,
      // Safety cap before JS filtering — pre-filter above should already keep this small
      take: Math.min(resultLimit * 4, 800),
    })) as MakeableCocktailRow[]

    // Batch all name lookups (substitutes + derivation bases) into a single
    // query. The two sets often overlap, and round-tripping twice is wasteful.
    const lookupIds = new Set<string>()
    for (const c of cocktails) {
      for (const i of c.ingredients) {
        for (const subId of i.substitutes) lookupIds.add(subId)
      }
    }
    for (const entries of dm.values()) {
      for (const e of entries) lookupIds.add(e.baseIngredientId)
    }

    const nameRows = lookupIds.size > 0
      ? (await prisma.ingredient.findMany({
          where: { id: { in: Array.from(lookupIds) } },
          select: {
              id: true,
              name: true,
              isAlcoholic: true,
              type: { select: { name: true } },
              subType: { select: { name: true } },
          },
        })) as IngredientMeta[]
      : []
    const ingredientMetaMap = new Map(nameRows.map((i) => [i.id, i]))
    const nameMap = new Map(nameRows.map((i) => [i.id, i.name]))

    return cocktails
      .map((cocktail) => this.evaluateCoverage(cocktail, userIdSet, dm, nameMap, ingredientMetaMap, pantryQuantities))
        .filter((c) =>
            c.missingCount <= maxMissing &&
            c.requiredCount > 0 &&
            c.satisfiedCount > 0
        )
      .sort((a, b) => {
        const order: Record<string, number> = { full: 0, withDerivates: 1, withSubstitutes: 2, missing: 3 }
        if (order[a.makeableStatus] !== order[b.makeableStatus]) {
          return order[a.makeableStatus] - order[b.makeableStatus]
        }
        return a.missingCount - b.missingCount
      })
      .slice(0, resultLimit)
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
