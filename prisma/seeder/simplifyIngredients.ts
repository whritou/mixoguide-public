import fs from 'fs'
import path from 'path'
import { Prisma, PrismaClient, type Ingredient, type MeasureUnit } from '@prisma/client'
import {
    canonicalizeIngredientName,
    getIngredientCanonicalPairs,
} from './components/ingredientCanonicalization'

type CocktailExport = {
    name: string
    ingredients?: Array<{ name: string }>
}

type IngredientExport = {
    name: string
}

type ReferenceCounts = {
    cocktailIngredients: number
    pantryItems: number
    mainAlcoholCocktails: number
    ingredientBarcodes: number
    derivativesAsBase: number
    derivativesAsDerived: number
}

type DbPlan = {
    alias: string
    canonical: string
    source: Ingredient
    target: Ingredient | null
    counts: ReferenceCounts
}

type MergeResult = {
    alias: string
    canonical: string
    createdTarget: boolean
    references: ReferenceCounts
}

const prisma = new PrismaClient()

const args = new Set(process.argv.slice(2))
const shouldUseDb = args.has('--db') || args.has('--apply')
const shouldApply = args.has('--apply')

const LIQUID_FACTORS: Record<string, Record<string, number>> = {
    ml: { ml: 1, cl: 0.1, oz: 1 / 30 },
    cl: { ml: 10, cl: 1, oz: 1 / 3 },
    oz: { ml: 30, cl: 3, oz: 1 },
}

const WEIGHT_FACTORS: Record<string, Record<string, number>> = {
    g: { g: 1 },
}

function convertUnit(amount: number, from: MeasureUnit, to: MeasureUnit): number | null {
    if (from === to) return amount

    for (const table of [LIQUID_FACTORS, WEIGHT_FACTORS]) {
        const factor = table[from]?.[to]
        if (factor != null) return +(amount * factor).toFixed(2)
    }

    return null
}

function usage() {
    console.log(`
Usage:
  tsx prisma/seeder/simplifyIngredients.ts
  tsx prisma/seeder/simplifyIngredients.ts --db
  tsx prisma/seeder/simplifyIngredients.ts --apply

Default mode audits the exported CocktailDB JSON files only.
--db    also inspects the current database and prints a merge dry run.
--apply rewires production references in a transaction, then deletes duplicate ingredient rows.
`)
}

function readJson<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function countExportUsage(cocktails: CocktailExport[]) {
    const usage = new Map<string, { count: number; cocktails: string[] }>()

    for (const cocktail of cocktails) {
        for (const ingredient of cocktail.ingredients ?? []) {
            const entry = usage.get(ingredient.name) ?? { count: 0, cocktails: [] }
            entry.count++
            if (entry.cocktails.length < 6) entry.cocktails.push(cocktail.name)
            usage.set(ingredient.name, entry)
        }
    }

    return usage
}

function auditExports() {
    const cocktailsPath = path.join(process.cwd(), 'prisma', 'seeder', 'exported_cocktails_simple.json')
    const ingredientsPath = path.join(process.cwd(), 'prisma', 'seeder', 'exported_ingredients.json')

    const cocktails = readJson<CocktailExport[]>(cocktailsPath)
    const ingredients = readJson<IngredientExport[]>(ingredientsPath)
    const usage = countExportUsage(cocktails)
    const exportNames = new Set([
        ...ingredients.map(i => i.name),
        ...usage.keys(),
    ])

    const rows = Array.from(exportNames)
        .map(name => ({ name, canonical: canonicalizeIngredientName(name), usage: usage.get(name) }))
        .filter(row => row.name !== row.canonical)
        .sort((a, b) => a.canonical.localeCompare(b.canonical) || a.name.localeCompare(b.name))

    const affectedSlots = rows.reduce((sum, row) => sum + (row.usage?.count ?? 0), 0)

    console.log(`Export audit: ${cocktails.length} cocktails, ${ingredients.length} ingredient rows`)
    console.log(`Configured aliases present in exports: ${rows.length} names, ${affectedSlots} cocktail ingredient slots\n`)

    if (rows.length === 0) {
        console.log('No configured aliases were found in the export files.\n')
        return
    }

    for (const row of rows) {
        const used = row.usage?.count ?? 0
        const examples = row.usage?.cocktails.length ? ` (${row.usage.cocktails.join(', ')})` : ''
        console.log(`${row.name} -> ${row.canonical}: ${used} use${used === 1 ? '' : 's'}${examples}`)
    }
    console.log('')
}

async function findIngredientByName(client: Prisma.TransactionClient | PrismaClient, name: string) {
    return client.ingredient.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
    })
}

async function getReferenceCounts(client: Prisma.TransactionClient | PrismaClient, ingredientId: string): Promise<ReferenceCounts> {
    const [
        cocktailIngredients,
        pantryItems,
        mainAlcoholCocktails,
        ingredientBarcodes,
        derivativesAsBase,
        derivativesAsDerived,
    ] = await Promise.all([
        client.cocktailIngredient.count({ where: { ingredientId } }),
        client.userPantryItem.count({ where: { ingredientId } }),
        client.cocktail.count({ where: { mainAlcoholId: ingredientId } }),
        client.ingredientBarcode.count({ where: { ingredientId } }),
        client.ingredientDerivative.count({ where: { baseIngredientId: ingredientId } }),
        client.ingredientDerivative.count({ where: { derivedId: ingredientId } }),
    ])

    return {
        cocktailIngredients,
        pantryItems,
        mainAlcoholCocktails,
        ingredientBarcodes,
        derivativesAsBase,
        derivativesAsDerived,
    }
}

function totalReferences(counts: ReferenceCounts) {
    return Object.values(counts).reduce((sum, count) => sum + count, 0)
}

async function buildDbPlans(client: PrismaClient | Prisma.TransactionClient): Promise<DbPlan[]> {
    const plans: DbPlan[] = []

    for (const pair of getIngredientCanonicalPairs()) {
        const source = await findIngredientByName(client, pair.alias)
        if (!source) continue

        const target = await findIngredientByName(client, pair.canonical)
        if (target?.id === source.id) continue

        plans.push({
            ...pair,
            source,
            target,
            counts: await getReferenceCounts(client, source.id),
        })
    }

    return plans
}

function firstNonNullDate(a: Date | null, b: Date | null) {
    if (!a) return b
    if (!b) return a
    return a < b ? a : b
}

function mergeNotes(targetNote: string | null, sourceNote: string | null, sourceName: string) {
    if (!sourceNote) return targetNote
    if (!targetNote) return sourceNote
    if (targetNote === sourceNote) return targetNote
    return `${targetNote}\n\nMerged duplicate ${sourceName} note:\n${sourceNote}`
}

function convertPantryAmount(amount: number, from: MeasureUnit, to: MeasureUnit, context: string) {
    if (from === to) return amount
    if (amount === 0) return 0

    const converted = convertUnit(amount, from, to)
    if (converted == null) {
        throw new Error(`Cannot merge ${context}: ${amount} ${from} cannot be converted to ${to}`)
    }

    return converted
}

async function ensureTargetIngredient(
    tx: Prisma.TransactionClient,
    source: Ingredient,
    canonical: string,
) {
    const existing = await findIngredientByName(tx, canonical)
    if (existing) return { target: existing, created: false }

    const target = await tx.ingredient.create({
        data: {
            name: canonical,
            typeId: source.typeId,
            subTypeId: source.subTypeId,
            description: source.description,
            unit: source.unit,
            isAlcoholic: source.isAlcoholic,
            abv: source.abv,
            brand: null,
            imageUrl: source.imageUrl,
        },
    })

    return { target, created: true }
}

async function mergeCocktailIngredients(
    tx: Prisma.TransactionClient,
    source: Ingredient,
    target: Ingredient,
) {
    const rows = await tx.cocktailIngredient.findMany({ where: { ingredientId: source.id } })

    for (const row of rows) {
        const existing = await tx.cocktailIngredient.findUnique({
            where: {
                cocktailId_ingredientId: {
                    cocktailId: row.cocktailId,
                    ingredientId: target.id,
                },
            },
        })

        if (!existing) {
            await tx.cocktailIngredient.update({
                where: { id: row.id },
                data: { ingredientId: target.id },
            })
            continue
        }

        const substitutes = Array.from(new Set([...existing.substitutes, ...row.substitutes]))
        const update: Prisma.CocktailIngredientUpdateInput = {}
        if (existing.amount == null && row.amount != null) {
            update.amount = row.amount
            update.unit = row.unit
        }
        if (substitutes.length !== existing.substitutes.length) {
            update.substitutes = substitutes
        }
        if (Object.keys(update).length > 0) {
            await tx.cocktailIngredient.update({ where: { id: existing.id }, data: update })
        }

        await tx.cocktailIngredient.delete({ where: { id: row.id } })
    }
}

async function mergePantryItems(
    tx: Prisma.TransactionClient,
    source: Ingredient,
    target: Ingredient,
) {
    const rows = await tx.userPantryItem.findMany({ where: { ingredientId: source.id } })

    for (const row of rows) {
        const existing = await tx.userPantryItem.findUnique({
            where: {
                userId_ingredientId: {
                    userId: row.userId,
                    ingredientId: target.id,
                },
            },
        })

        if (!existing) {
            await tx.userPantryItem.update({
                where: { id: row.id },
                data: { ingredientId: target.id },
            })
            continue
        }

        const sourceQuantity = convertPantryAmount(
            row.quantity,
            row.unitLeft,
            existing.unitLeft,
            `${source.name} pantry quantity for user ${row.userId}`,
        )
        const sourceShoppingQuantity = convertPantryAmount(
            row.shoppingQuantity,
            row.unitLeft,
            existing.unitLeft,
            `${source.name} shopping quantity for user ${row.userId}`,
        )

        const update: Prisma.UserPantryItemUpdateInput = {
            quantity: existing.quantity + sourceQuantity,
            shoppingQuantity: existing.shoppingQuantity + sourceShoppingQuantity,
            favorite: existing.favorite || row.favorite,
            isEssential: existing.isEssential || row.isEssential,
            isInfinite: existing.isInfinite || row.isInfinite,
            isInPantry: existing.isInPantry || row.isInPantry,
            isInShoppingList: existing.isInShoppingList || row.isInShoppingList,
            expirationDate: firstNonNullDate(existing.expirationDate, row.expirationDate),
            note: mergeNotes(existing.note, row.note, source.name),
        }

        await tx.userPantryItem.update({ where: { id: existing.id }, data: update })
        await tx.userPantryItem.delete({ where: { id: row.id } })
    }
}

async function mergeDerivatives(
    tx: Prisma.TransactionClient,
    source: Ingredient,
    target: Ingredient,
) {
    const asBase = await tx.ingredientDerivative.findMany({ where: { baseIngredientId: source.id } })
    for (const row of asBase) {
        if (row.derivedId === target.id) {
            await tx.ingredientDerivative.delete({ where: { id: row.id } })
            continue
        }

        const existing = await tx.ingredientDerivative.findUnique({
            where: {
                baseIngredientId_derivedId: {
                    baseIngredientId: target.id,
                    derivedId: row.derivedId,
                },
            },
        })

        if (existing) {
            await tx.ingredientDerivative.delete({ where: { id: row.id } })
        } else {
            await tx.ingredientDerivative.update({
                where: { id: row.id },
                data: { baseIngredientId: target.id },
            })
        }
    }

    const asDerived = await tx.ingredientDerivative.findMany({ where: { derivedId: source.id } })
    for (const row of asDerived) {
        if (row.baseIngredientId === target.id) {
            await tx.ingredientDerivative.delete({ where: { id: row.id } })
            continue
        }

        const existing = await tx.ingredientDerivative.findUnique({
            where: {
                baseIngredientId_derivedId: {
                    baseIngredientId: row.baseIngredientId,
                    derivedId: target.id,
                },
            },
        })

        if (existing) {
            await tx.ingredientDerivative.delete({ where: { id: row.id } })
        } else {
            await tx.ingredientDerivative.update({
                where: { id: row.id },
                data: { derivedId: target.id },
            })
        }
    }
}

async function mergeOneIngredient(
    tx: Prisma.TransactionClient,
    plan: DbPlan,
): Promise<MergeResult | null> {
    const source = await tx.ingredient.findUnique({ where: { id: plan.source.id } })
    if (!source) return null

    const { target, created } = await ensureTargetIngredient(tx, source, plan.canonical)
    if (source.id === target.id) return null

    await mergeCocktailIngredients(tx, source, target)
    await mergePantryItems(tx, source, target)
    await tx.cocktail.updateMany({
        where: { mainAlcoholId: source.id },
        data: { mainAlcoholId: target.id },
    })
    await tx.ingredientBarcode.updateMany({
        where: { ingredientId: source.id },
        data: { ingredientId: target.id },
    })
    await mergeDerivatives(tx, source, target)
    await tx.ingredient.delete({ where: { id: source.id } })

    return {
        alias: plan.alias,
        canonical: plan.canonical,
        createdTarget: created,
        references: plan.counts,
    }
}

function printDbPlans(plans: DbPlan[]) {
    if (plans.length === 0) {
        console.log('Database dry run: no duplicate ingredient rows found for configured aliases.\n')
        return
    }

    console.log(`Database dry run: ${plans.length} duplicate ingredient rows can be merged\n`)
    for (const plan of plans) {
        const target = plan.target ? plan.target.name : `${plan.canonical} (will be created)`
        console.log(`${plan.source.name} -> ${target}: ${totalReferences(plan.counts)} references`)
        console.log(`  cocktailIngredients=${plan.counts.cocktailIngredients}, pantryItems=${plan.counts.pantryItems}, mainAlcohol=${plan.counts.mainAlcoholCocktails}, barcodes=${plan.counts.ingredientBarcodes}, derivatives=${plan.counts.derivativesAsBase + plan.counts.derivativesAsDerived}`)
    }
    console.log('\nRun again with --apply to execute these merges in a transaction.\n')
}

async function applyDbPlans(plans: DbPlan[]) {
    if (plans.length === 0) {
        console.log('No database merges to apply.')
        return
    }

    const results = await prisma.$transaction(async (tx) => {
        const applied: MergeResult[] = []
        for (const plan of plans) {
            const result = await mergeOneIngredient(tx, plan)
            if (result) applied.push(result)
        }
        return applied
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 120_000,
    })

    console.log(`Applied ${results.length} ingredient merge${results.length === 1 ? '' : 's'}.\n`)
    for (const result of results) {
        const created = result.createdTarget ? ' (created canonical target)' : ''
        console.log(`${result.alias} -> ${result.canonical}${created}: ${totalReferences(result.references)} references moved`)
    }
    console.log('')
}

async function main() {
    if (args.has('--help') || args.has('-h')) {
        usage()
        return
    }

    auditExports()

    if (!shouldUseDb) return

    const plans = await buildDbPlans(prisma)
    if (shouldApply) {
        await applyDbPlans(plans)
    } else {
        printDbPlans(plans)
    }
}

main()
    .catch(err => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
