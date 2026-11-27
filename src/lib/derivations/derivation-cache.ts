import { prisma } from '@/lib/db/prisma'
import type { MeasureUnit } from '@prisma/client'
import { isNonBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'

export interface DerivationEntry {
  baseIngredientId: string
  yieldAmount: number
  yieldUnit: MeasureUnit
  requiresTool: string | null
}

/**
 * Lookup map: derivedIngredientId → list of base ingredients that can produce it.
 * Loaded once, cached in memory for the lifetime of the server process.
 */
export type DerivationMap = Map<string, DerivationEntry[]>

// Promise-based singleton: concurrent callers all await the same in-flight query
// instead of each firing their own DB round-trip (race-condition fix).
let cachePromise:   Promise<DerivationMap> | null = null
let cacheTimestamp: number                         = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function buildDerivationMap(): Promise<DerivationMap> {
  const rows = await prisma.ingredientDerivative.findMany({
    select: {
      baseIngredientId: true,
      derivedId:        true,
      yieldAmount:      true,
      yieldUnit:        true,
      requiresTool:     true,
    },
  })

  const map: DerivationMap = new Map()
  for (const row of rows) {
    const entry: DerivationEntry = {
      baseIngredientId: row.baseIngredientId,
      yieldAmount:      row.yieldAmount,
      yieldUnit:        row.yieldUnit,
      requiresTool:     row.requiresTool,
    }
    const existing = map.get(row.derivedId)
    if (existing) existing.push(entry)
    else map.set(row.derivedId, [entry])
  }
  return map
}

export function getDerivationMap(): Promise<DerivationMap> {
  const now = Date.now()
  if (cachePromise && now - cacheTimestamp < CACHE_TTL_MS) return cachePromise

  cacheTimestamp = now
  cachePromise   = buildDerivationMap().catch(err => {
    // Reset on failure so the next caller retries rather than receiving
    // a cached rejection forever.
    cachePromise = null
    throw err
  })
  return cachePromise
}

/** Force a cache refresh (e.g. after seeder or admin changes). */
export function invalidateDerivationCache() {
  cachePromise   = null
  cacheTimestamp = 0
  catalogPromise   = null
  catalogTimestamp = 0
}

// ─── Ingredient catalog metadata (for makeable computation) ─────────────────

export interface IngredientCatalogEntry {
  id: string
  name: string
  isAlcoholic: boolean | null
  type: { name: string } | null
  subType: { name: string } | null
}

export interface IngredientCatalog {
  byId: Map<string, IngredientCatalogEntry>
  /**
   * Ingredients that are never blocking on their own (garnishes, peels, twists…),
   * i.e. `isNonBlockingCocktailIngredient` is true for a required, measured row.
   * Row-level rules (optional / no amount / twist|zest|slice unit) are applied in SQL.
   */
  nonBlockingIds: string[]
}

let catalogPromise:   Promise<IngredientCatalog> | null = null
let catalogTimestamp: number                            = 0

async function buildIngredientCatalog(): Promise<IngredientCatalog> {
  const rows = await prisma.ingredient.findMany({
    select: {
      id: true,
      name: true,
      isAlcoholic: true,
      type: { select: { name: true } },
      subType: { select: { name: true } },
    },
  })
  const byId = new Map<string, IngredientCatalogEntry>()
  const nonBlockingIds: string[] = []
  for (const row of rows) {
    byId.set(row.id, row)
    if (isNonBlockingCocktailIngredient({ optional: false, amount: 1, unit: 'cl', ingredient: row })) {
      nonBlockingIds.push(row.id)
    }
  }
  return { byId, nonBlockingIds }
}

export function getIngredientCatalog(): Promise<IngredientCatalog> {
  const now = Date.now()
  if (catalogPromise && now - catalogTimestamp < CACHE_TTL_MS) return catalogPromise

  catalogTimestamp = now
  catalogPromise   = buildIngredientCatalog().catch(err => {
    catalogPromise = null
    throw err
  })
  return catalogPromise
}

/**
 * Check if a user's pantry can fulfill an ingredient requirement,
 * either directly or via derivation from another pantry ingredient.
 *
 * @param userIngredientIds Set of ingredient IDs the user has in their pantry
 * @param ingredientId     The required ingredient ID
 * @param derivationMap    Pre-loaded derivation lookup map
 * @returns The ID of the ingredient that fulfills the requirement (could be the same or a base ingredient), or null
 */
export function findFulfillingIngredient(
  userIngredientIds: Set<string>,
  ingredientId: string,
  derivationMap: DerivationMap,
): string | null {
  // Direct match
  if (userIngredientIds.has(ingredientId)) return ingredientId

  // Check derivations: can any base ingredient in the pantry produce this?
  const derivations = derivationMap.get(ingredientId)
  if (!derivations) return null

  for (const d of derivations) {
    if (userIngredientIds.has(d.baseIngredientId)) return d.baseIngredientId
  }

  return null
}

/**
 * Check if the user can fulfill a specific amount of an ingredient via derivation.
 *
 * @returns The usable amount in the target unit, or null if not derivable
 */
export function getDerivableAmount(
  baseIngredientId: string,
  derivedIngredientId: string,
  baseQuantity: number,
  derivationMap: DerivationMap,
): { amount: number; unit: MeasureUnit } | null {
  const derivations = derivationMap.get(derivedIngredientId)
  if (!derivations) return null

  const entry = derivations.find((d) => d.baseIngredientId === baseIngredientId)
  if (!entry) return null

  const usableAmount = baseQuantity * entry.yieldAmount
  return { amount: +usableAmount.toFixed(2), unit: entry.yieldUnit }
}

// Re-export convertUnit for consumers that import from this module
export { convertUnit } from '@/utils/unitConversion'
