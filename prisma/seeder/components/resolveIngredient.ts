import {CocktailDBIngredient, ResolvedIngredient} from "./types"
import { normalizeName, delay }  from './utils'
import { PrismaClient } from '@prisma/client'
import {INGREDIENT_SUBTYPE_KEYWORDS, INGREDIENT_TYPE_MAP} from "./constants";
import { cocktailDbApiUrl } from "./cocktailDb"
import { canonicalizeIngredientName } from './ingredientCanonicalization'

const prisma = new PrismaClient()

function resolveUnit(
    ingredientName: string,
    typeName: string,
): string {
    const name = normalizeName(ingredientName)

    // ── Garnish / pieces ───────────────────────────────
    if (typeName === 'Garnish') {
        if (name.includes('zest') || name.includes('peel')) return 'zest'
        if (name.includes('slice') || name.includes('wedge')) return 'slice'
        return 'pcs'
    }

    // ── Fresh produce ─────────────────────────────────
    if (typeName === 'Fresh Produce') {
        if (name.includes('zest') || name.includes('peel')) return 'zest'
        if (name.includes('slice') || name.includes('wedge')) return 'slice'
        if (name.includes('juice')) return 'ml'
        return 'pcs'
    }

    // ── Juice ─────────────────────────────────────────
    if (typeName === 'Juice') {
        return 'ml'
    }

    // ── Syrups / sweeteners ───────────────────────────
    if (typeName === 'Sweetener') {
        return 'ml'
    }

    // ── Bitters ───────────────────────────────────────
    if (typeName === 'Bitters') {
        return 'ml' // could later introduce "dash"
    }

    // ── Spirits / alcohol ─────────────────────────────
    if (
        typeName === 'Spirit' ||
        typeName === 'Liqueur' ||
        typeName === 'Wine' ||
        typeName === 'Fortified Wine' ||
        typeName === 'Beer & Cider'
    ) {
        return 'cl'
    }

    // ── Dairy ─────────────────────────────────────────
    if (typeName === 'Dairy & Egg') {
        if (name.includes('egg')) return 'pcs'
        return 'ml'
    }

    // ── Carbonated mixers ─────────────────────────────
    if (typeName === 'Carbonated Mixer') {
        return 'ml'
    }

    // ── Powder / spices fallback ──────────────────────
    if (
        name.includes('sugar') ||
        name.includes('salt') ||
        name.includes('powder')
    ) {
        return 'g'
    }

    // ── Default fallback ──────────────────────────────
    return 'ml'
}

export function resolveTypeAndSubType(
    ingredientName: string,
    apiType: string | null,
    typeMap: Map<string, string>,
    subTypeMap: Map<string, string>,
): { typeId: string; subTypeId: string | null } {
    const searchStr = normalizeName(`${ingredientName} ${apiType ?? ''}`)

    // Try keyword matching first
    for (const entry of INGREDIENT_SUBTYPE_KEYWORDS) {
        if (entry.keywords.every(kw => searchStr.includes(kw))) {
            const typeId = typeMap.get(entry.type)
            const subTypeId = subTypeMap.get(`${entry.type}::${entry.subType}`)
            if (typeId) return { typeId, subTypeId: subTypeId ?? null }
        }
    }

    // Fallback: use apiType to get at least the type
    if (apiType) {
        const normalizedApiType = normalizeName(apiType)
        for (const [key, typeName] of Object.entries(INGREDIENT_TYPE_MAP)) {
            if (normalizedApiType.includes(key)) {
                const typeId = typeMap.get(typeName)
                if (typeId) return { typeId, subTypeId: null }
            }
        }
    }

    // Ultimate fallback: "Other"
    const otherId = typeMap.get('Other')!
    return { typeId: otherId, subTypeId: null }
}

async function fetchIngredientDetails(name: string): Promise<CocktailDBIngredient | null> {
    try {
        const res = await fetch(cocktailDbApiUrl('search.php', { i: name }))
        const data = await res.json()
        return data.ingredients?.[0] ?? null
    } catch (err) {
        console.warn(`  ⚠ Failed to fetch ingredient "${name}":`, (err as Error).message)
        return null
    }
}

export async function resolveIngredient(
    name: string,
    ingredientCache: Map<string, ResolvedIngredient>,
    typeMap: Map<string, string>,
    subTypeMap: Map<string, string>,
    writeToDb: boolean = true,
): Promise<ResolvedIngredient | (ResolvedIngredient & { subTypeName?: string }) | null> {
    const ingredientName = canonicalizeIngredientName(name)
    const normalized = normalizeName(ingredientName)

    // Check cache
    if (ingredientCache.has(normalized)) return ingredientCache.get(normalized)!

    // Check DB (case-insensitive)
    const existing = await prisma.ingredient.findFirst({
        where: { name: { equals: ingredientName, mode: 'insensitive' } },
        include: { type: true },
    })
    if (existing) {
        // Re-resolve type/subtype against updated keyword maps
        const { typeId: newTypeId, subTypeId: newSubTypeId } = resolveTypeAndSubType(ingredientName, null, typeMap, subTypeMap)
        const otherId = typeMap.get('Other')

        // Update if changed — but never downgrade a specific type to 'Other'
        const changed = newTypeId !== existing.typeId || newSubTypeId !== (existing.subTypeId ?? null)
        const isDowngrade = newTypeId === otherId && existing.typeId !== otherId
        if (changed && !isDowngrade) {
            await prisma.ingredient.update({
                where: { id: existing.id },
                data: { typeId: newTypeId, subTypeId: newSubTypeId ?? null },
            })
            const newTypeName = Array.from(typeMap.entries()).find(([, id]) => id === newTypeId)?.[0] ?? 'Other'
            console.log(`  ↺ Updated: "${name.trim()}" type → ${newTypeName}`)
            const resolved: ResolvedIngredient = {
                id: existing.id, name: existing.name,
                isAlcoholic: existing.isAlcoholic ?? false,
                typeId: newTypeId, typeName: newTypeName,
            }
            ingredientCache.set(normalized, resolved)
            return resolved
        }

        const resolved: ResolvedIngredient = {
            id: existing.id,
            name: existing.name,
            isAlcoholic: existing.isAlcoholic ?? false,
            typeId: existing.typeId,
            typeName: existing.type.name,
        }
        ingredientCache.set(normalized, resolved)
        return resolved
    }

    // Fetch from API
    const apiData = await fetchIngredientDetails(ingredientName)
    await delay(200)

    // Resolve type/subtype
    const { typeId, subTypeId } = resolveTypeAndSubType(ingredientName, apiData?.strType ?? null, typeMap, subTypeMap)

    const typeName = Array.from(typeMap.entries()).find(([, id]) => id === typeId)?.[0] ?? 'Other'
    // derive subtype name from subTypeMap if available
    const subTypeName = subTypeId ? (Array.from(subTypeMap.entries()).find(([, id]) => id === subTypeId)?.[0]?.split('::')[1] ?? null) : null

    const defaultUnit = resolveUnit(ingredientName, typeName)

    const isAlcoholic = apiData?.strAlcohol === 'Yes' ||
        ['Spirit', 'Liqueur', 'Fortified Wine', 'Wine', 'Beer & Cider', 'Bitters'].includes(typeName)
    const abv = apiData?.strABV ? parseFloat(apiData.strABV) : (isAlcoholic ? undefined : 0)
    const imageUrl = `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ingredientName)}-Medium.png`

    // If caller asks not to write to DB (export/dry-run mode), return a resolved object without creating
    if (!writeToDb) {
        const resolvedNoWrite = {
            id: null,
            name: ingredientName,
            isAlcoholic: isAlcoholic ?? false,
            typeId,
            typeName,
            subTypeId: subTypeId ?? null,
            subTypeName: subTypeName ?? null,
            defaultUnit
        }
        ingredientCache.set(normalized, resolvedNoWrite as any)
        return resolvedNoWrite as any
    }

    try {
        const created = await prisma.ingredient.create({
            data: {
                name: ingredientName,
                typeId,
                subTypeId,
                description: apiData?.strDescription ?? null,
                isAlcoholic,
                abv: isNaN(abv as number) ? null : abv,
                imageUrl,
            },
        })

        const resolved: ResolvedIngredient = {
            id: created.id,
            name: created.name,
            isAlcoholic: created.isAlcoholic ?? false,
            typeId: created.typeId,
            typeName,
        }
        ingredientCache.set(normalized, resolved)
        console.log(`  + Created ingredient: "${ingredientName}" (${typeName}${subTypeId ? '' : ' - no subtype'})`)
        return resolved
    } catch (err: any) {
        // Unique constraint violation — another process or re-run may have created it
        if (err?.code === 'P2002') {
            const retry = await prisma.ingredient.findFirst({
                where: { name: { equals: ingredientName, mode: 'insensitive' } },
                include: { type: true },
            })
            if (retry) {
                const resolved: ResolvedIngredient = {
                    id: retry.id, name: retry.name,
                    isAlcoholic: retry.isAlcoholic ?? false,
                    typeId: retry.typeId, typeName: retry.type.name,
                }
                ingredientCache.set(normalized, resolved)
                return resolved
            }
        }
        console.warn(`  ⚠ Failed to create ingredient "${name}":`, err.message)
        return null
    }
}
