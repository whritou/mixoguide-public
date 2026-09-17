import { PrismaClient } from '@prisma/client'
import fs from "fs"
import { CocktailDBDrink, Technique, Difficulty, ParsedMeasure, ResolvedIngredient } from './components/types'
import { generateCocktailDescription } from "./components/generateCocktailDescription"
import { resolveIngredient, resolveTypeAndSubType } from "./components/resolveIngredient"
import { resolveGlass } from "./components/resolveGlass"
import { inferFlavors } from "./components/inferFlavors"
import { inferOccasions } from "./components/inferOccasions"
import { normalizeName, delay, parseMeasure, splitInstructions } from './components/utils'
import { cocktailDbApiUrl } from "./components/cocktailDb"
import { canonicalizeIngredientName } from './components/ingredientCanonicalization'
import { calculateCocktailComplexity, inferTechniquesFromInstructions } from './components/cocktailComplexity'
import path from 'path'

const prisma = new PrismaClient()

function determineMainAlcohol(resolved: ResolvedIngredient[]): string | null {
    const spirit = resolved.find(r => r.isAlcoholic)
    return spirit ? spirit.id : null
}

function determineBarTools(instructions: string[], techniques: Technique[]): string[] {
    // Minimal heuristic: map techniques to common tools (names must match DB bar tool names)
    const mapping: Partial<Record<Technique, string>> = {
        shaken: 'Shaker', stirred: 'Bar Spoon', built: 'Jigger', layered: 'Bar Spoon', blended: 'Blender', muddled: 'Muddler', smoked: 'Smoking Gun', flamed: 'Torch', infused: 'Infuser', clarified: 'Clarifier'
    }
    const tools = new Set<string>()
    for (const t of techniques) if (mapping[t]) tools.add(mapping[t]!)
    // Simple instruction-based hints
    const joined = instructions.join(' ').toLowerCase()
    if (joined.includes('strain')) tools.add('Strainer')
    if (joined.includes('fine strain') || joined.includes('double strain')) tools.add('Fine Strainer')
    if (joined.includes('jigger') || joined.includes('measure')) tools.add('Jigger')
    if (joined.includes('mixing glass')) tools.add('Mixing Glass')
    if (/\btorch\b|\bflame\b|\bflamed\b|\bignite\b|\bflambe\b/.test(joined)) tools.add('Torch')
    if (/\bsmoke\b|\bsmoked\b|\bsmoking gun\b|\bwood chips\b|\bcloche\b/.test(joined)) tools.add('Smoking Gun')
    if (/\binfuse\b|\binfused\b|\binfusion\b|\bsteep\b|\bfat[-\s]?wash\b/.test(joined)) tools.add('Infuser')
    if (/\bclarify\b|\bclarified\b|\bclarification\b|\bmilk[-\s]?wash\b/.test(joined)) tools.add('Clarifier')
    return Array.from(tools)
}

// ─── API FETCH FUNCTIONS ─────────────────────────────────────────────────────

async function fetchCocktailsByLetter(letter: string): Promise<CocktailDBDrink[]> {
    try {
        const res = await fetch(cocktailDbApiUrl('search.php', { f: letter }))
        const data = await res.json()
        return data.drinks ?? []
    } catch (err) {
        console.warn(`  ⚠ Failed to fetch letter "${letter}":`, (err as Error).message)
        return []
    }
}

async function main() {
    console.log('🍸 CocktailDB Seed — Starting...\n')

    // Step 1: Load DB reference data
    const dbTypes = (await prisma.ingredientType.findMany()) as { name: string; id: string }[]
    const typeMap = new Map(dbTypes.map(t => [t.name, t.id] as [string, string]))

    const dbSubTypes = (await prisma.ingredientSubType.findMany({ include: { type: true } })) as { type: { name: string }; name: string; id: string }[]
    const subTypeMap = new Map(dbSubTypes.map(s => [`${s.type.name}::${s.name}`, s.id] as [string, string]))

    const dbGlasses = (await prisma.glass.findMany()) as { name: string; id: string }[]
    const glassCache = new Map(dbGlasses.map(g => [g.name.toLowerCase(), g.id] as [string, string]))

    // Load bar tools map for lookups when creating relations
    const dbBarTools = (await prisma.barTool.findMany()) as { name: string; id: string }[]

    // Step 2: Pre-populate ingredient cache
    const ingredientCache = new Map<string, ResolvedIngredient>()
    const existingIngredients = await prisma.ingredient.findMany({ include: { type: true, subType: true } })
    for (const ing of existingIngredients) {
        ingredientCache.set(normalizeName(ing.name), {
            id: ing.id, name: ing.name,
            isAlcoholic: ing.isAlcoholic ?? false,
            typeId: ing.typeId, typeName: ing.type.name,
        })
    }
    console.log(`Loaded: ${typeMap.size} types, ${subTypeMap.size} subtypes, ${glassCache.size} glasses, ${ingredientCache.size} ingredients\n`)

    // Step 2b: Update existing ingredient types/subtypes using current keyword maps.
    // The cache pre-population above would otherwise skip re-resolution entirely.
    console.log('Updating existing ingredient types/subtypes...')
    const otherId = typeMap.get('Other')
    let updatedCount = 0
    for (const ing of existingIngredients) {
        const { typeId: newTypeId, subTypeId: newSubTypeId } = resolveTypeAndSubType(ing.name, null, typeMap, subTypeMap)
        const currentSubTypeId = (ing as any).subType?.id ?? null
        const changed = newTypeId !== ing.typeId || newSubTypeId !== currentSubTypeId
        const isDowngrade = newTypeId === otherId && ing.typeId !== otherId
        if (changed && !isDowngrade) {
            await prisma.ingredient.update({
                where: { id: ing.id },
                data: { typeId: newTypeId, subTypeId: newSubTypeId ?? null },
            })
            const newTypeName = Array.from(typeMap.entries()).find(([, id]) => id === newTypeId)?.[0] ?? 'Other'
            console.log(`  ↺ ${ing.name}: ${ing.type.name} → ${newTypeName}`)
            // Refresh cache entry with updated values
            ingredientCache.set(normalizeName(ing.name), {
                id: ing.id, name: ing.name,
                isAlcoholic: ing.isAlcoholic ?? false,
                typeId: newTypeId, typeName: newTypeName,
            })
            updatedCount++
        }
    }
    console.log(`Updated ${updatedCount} ingredient(s).\n`)

    // Step 3: Counters
    let created = 0, skipped = 0, failed = 0
    const missingIngredients: string[] = []

    // Step 4: Iterate a-z
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    for (const letter of letters) {
        console.log(`--- Letter: ${letter.toUpperCase()} ---`)
        const drinks = await fetchCocktailsByLetter(letter)
        await delay(300)

        if (drinks.length === 0) {
            console.log('  No drinks found.')
            continue
        }
        console.log(`  Found ${drinks.length} drinks`)

        for (const drink of drinks) {
            const drinkName = drink.strDrink?.trim()
            if (!drinkName) { failed++; continue }

            // Resolve ingredients
            const resolvedIngredients: { resolved: ResolvedIngredient; measure: ParsedMeasure }[] = []
            for (let i = 1; i <= 15; i++) {
                const ingName = drink[`strIngredient${i}`] as string | null
                if (!ingName?.trim()) continue

                const ingredientName = canonicalizeIngredientName(ingName.trim())
                const measure = parseMeasure(drink[`strMeasure${i}`] as string | null)
                const resolved = await resolveIngredient(ingredientName, ingredientCache, typeMap, subTypeMap)
                if (resolved) {
                    resolvedIngredients.push({ resolved, measure })
                } else {
                    missingIngredients.push(ingredientName)
                }
            }

            if (resolvedIngredients.length === 0) {
                console.log(`  ✗ Skipped "${drinkName}" (no ingredients resolved)`)
                failed++
                continue
            }

            // Resolve glass
            const glassId = await resolveGlass(drink.strGlass, glassCache)

            // Infer metadata
            const ingredientNames = resolvedIngredients.map(r => r.resolved.name)
            const isAlcoholic = drink.strAlcoholic
                ? drink.strAlcoholic.toLowerCase().includes('alcoholic') && !drink.strAlcoholic.toLowerCase().includes('non')
                : true
            const instructionText = drink.strInstructions ?? ''
            const instructions = splitInstructions(drink.strInstructions)
            const techniques = inferTechniquesFromInstructions(instructionText)
            const flavors = inferFlavors(ingredientNames, isAlcoholic)
            const occasions = inferOccasions(ingredientNames, flavors, isAlcoholic)
            const mainAlcoholId = determineMainAlcohol(resolvedIngredients.map(r => r.resolved))
            const barTools = determineBarTools(instructions, techniques)
            const complexity = calculateCocktailComplexity({
                ingredientCount: resolvedIngredients.length,
                instructions,
                techniques,
                barTools,
            })
            const { difficulty, preparationTime } = complexity

            // Generate description
            const glassNameForDesc = drink.strGlass ?? null
            const description = generateCocktailDescription({
                name: drinkName,
                glassName: glassNameForDesc,
                techniques,
                flavors,
                occasions,
                ingredients: resolvedIngredients.map(r => r.resolved),
                isAlcoholic,
                difficulty,
            })

            // If a cocktail with this name already exists, update only the changed metadata
            const existingCocktail = await prisma.cocktail.findFirst({ where: { name: { equals: drinkName, mode: 'insensitive' } } })
            if (existingCocktail) {
                try {
                    await prisma.cocktail.update({
                        where: { id: existingCocktail.id },
                        data: {
                            description,
                            instructions,
                            imageUrl: drink.strDrinkThumb ?? null,
                            isAlcoholic,
                            mainAlcoholId,
                            difficulty,
                            preparationTime,
                            technique: techniques as any,
                            flavors: flavors as any,
                            occasions: occasions as any,
                            glassId,
                        },
                    })

                    // Add missing ingredient relations without deleting existing ones
                    if (resolvedIngredients.length) {
                        await prisma.cocktailIngredient.createMany({
                            data: resolvedIngredients.map(({ resolved, measure }) => ({
                                cocktailId: existingCocktail.id,
                                ingredientId: resolved.id,
                                amount: measure.amount,
                                unit: measure.unit as any,
                                optional: false,
                                substitutes: [],
                            })),
                            skipDuplicates: true,
                        })
                    }

                    // Add missing bar tool relations without deleting existing ones
                    const resolvedBarTools = barTools
                        .map((name: string) => dbBarTools.find(b => b.name === name)?.id)
                        .filter((id: string | undefined): id is string => id !== undefined)
                    if (resolvedBarTools.length) {
                        await prisma.cocktailBarTool.createMany({
                            data: resolvedBarTools.map((barToolId: string) => ({ cocktailId: existingCocktail.id, barToolId })),
                            skipDuplicates: true,
                        })
                    }

                    skipped++
                    continue
                } catch (err: any) {
                    console.warn(`  ✗ Failed to update existing "${drinkName}":`, err.message)
                    failed++
                    continue
                }
            }

            // Create cocktail
            try {
                const cocktail = await prisma.cocktail.create({
                    data: {
                        name: drinkName,
                        description,
                        instructions,
                        imageUrl: drink.strDrinkThumb ?? null,
                        isAlcoholic,
                        mainAlcoholId,
                        source: 'cocktaildb',
                        externalId: drink.idDrink,
                        difficulty,
                        preparationTime,
                        technique: techniques as any,
                        flavors: flavors as any,
                        occasions: occasions as any,
                        glassId,
                    },
                })

                // Create CocktailIngredient relations
                await prisma.cocktailIngredient.createMany({
                    data: resolvedIngredients.map(({ resolved, measure }) => ({
                        cocktailId: cocktail.id,
                        ingredientId: resolved.id,
                        amount: measure.amount,
                        unit: measure.unit as any,
                        optional: false,
                        substitutes: [],
                    })),
                    skipDuplicates: true,
                })

                // Create CocktailBarTool relations
                const resolvedBarTools = barTools
                    .map((name: string) => dbBarTools.find(b => b.name === name)?.id)
                    .filter((id: string | undefined): id is string => id !== undefined)
                if (resolvedBarTools.length) {
                    await prisma.cocktailBarTool.createMany({
                        data: resolvedBarTools.map((barToolId: string) => ({ cocktailId: cocktail.id, barToolId })),
                        skipDuplicates: true,
                    })
                }

                created++
                console.log(`  ✓ Created: "${drinkName}" (${resolvedIngredients.length} ingredients)`)
            } catch (err: any) {
                if (err?.code === 'P2002') {
                    skipped++ // duplicate caught at DB level
                } else {
                    console.warn(`  ✗ Failed to create "${drinkName}":`, err.message)
                    failed++
                }
            }
        }
    }

    // Step 5: Summary
    console.log('\n══════════════════════════════════════════')
    console.log('  CocktailDB Seed Complete')
    console.log('══════════════════════════════════════════')
    console.log(`  Created:  ${created}`)
    console.log(`  Skipped:  ${skipped} (duplicates)`)
    console.log(`  Failed:   ${failed}`)
    if (missingIngredients.length > 0) {
        const unique = Array.from(new Set(missingIngredients))
        console.log(`  Missing ingredients (${unique.length}):`)
        unique.forEach(n => console.log(`    - ${n}`))
    }
    console.log('══════════════════════════════════════════\n')
}

// New: export collected cocktails + ingredients to JSON without writing DB
async function exportToJson(simple: boolean = false) {
    console.log('🍸 CocktailDB Export — Starting (no DB writes)...\n')

    // Load DB reference data (for resolution)
    const dbTypes = (await prisma.ingredientType.findMany()) as { name: string; id: string }[]
    const typeMap = new Map(dbTypes.map(t => [t.name, t.id] as [string, string]))

    const dbSubTypes = (await prisma.ingredientSubType.findMany({ include: { type: true } })) as { type: { name: string }; name: string; id: string }[]
    const subTypeMap = new Map(dbSubTypes.map(s => [`${s.type.name}::${s.name}`, s.id] as [string, string]))
    // Create reverse map id -> name for subtypes
    const subTypeReverse = new Map<string, string>()
    for (const s of dbSubTypes) subTypeReverse.set(s.id, s.name)

    const dbGlasses = (await prisma.glass.findMany()) as { name: string; id: string }[]
    const glassCache = new Map(dbGlasses.map(g => [g.name.toLowerCase(), g.id] as [string, string]))

    // Note: we don't need barToolMap in export mode (we keep bar tool names only)
    // const dbBarTools = (await prisma.barTool.findMany()) as { name: string; id: string }[]
    // const barToolMap = new Map(dbBarTools.map(b => [b.name, b.id] as [string, string]))

    // Pre-populate ingredient cache from DB
    const ingredientCache = new Map<string, any>()
    // include subType so we can export subtype name
    const existingIngredients = await prisma.ingredient.findMany({ include: { type: true, subType: true } })
    for (const ing of existingIngredients) {
        ingredientCache.set(normalizeName(ing.name), {
            id: ing.id,
            name: ing.name,
            isAlcoholic: ing.isAlcoholic ?? false,
            typeId: ing.typeId,
            typeName: ing.type.name,
            subTypeId: (ing as any).subType?.id ?? null,
            subTypeName: (ing as any).subType?.name ?? null,
        })
    }

    const cocktailsOut: any[] = []
    const ingredientOutMap = new Map<string, any>()

    const letters = 'abcdefghijklmnopqrstuvwxyz'
    for (const letter of letters) {
        console.log(`--- Letter: ${letter.toUpperCase()} ---`)
        const drinks = await fetchCocktailsByLetter(letter)
        await delay(300)

        if (drinks.length === 0) {
            console.log('  No drinks found.')
            continue
        }
        console.log(`  Found ${drinks.length} drinks`)

        for (const drink of drinks) {
            const drinkName = drink.strDrink?.trim()
            if (!drinkName) continue

            // Resolve ingredients
            const resolvedIngredients: { resolved: any; measure: any; originalName: string }[] = []
            for (let i = 1; i <= 15; i++) {
                const ingName = drink[`strIngredient${i}`] as string | null
                if (!ingName?.trim()) continue

                const ingredientName = canonicalizeIngredientName(ingName.trim())
                const measure = parseMeasure(drink[`strMeasure${i}`] as string | null)
                const resolved = await resolveIngredient(ingredientName, ingredientCache, typeMap, subTypeMap, false)
                if (resolved) {
                    resolvedIngredients.push({ resolved, measure, originalName: ingredientName })
                    // add to ingredientOutMap
                    const key = normalizeName(resolved.name)
                    if (!ingredientOutMap.has(key)) {
                        ingredientOutMap.set(key, {
                            id: resolved.id,
                            name: resolved.name,
                            isAlcoholic: resolved.isAlcoholic ?? false,
                            typeId: resolved.typeId,
                            typeName: resolved.typeName,
                            subTypeName: (resolved as any).subTypeName ?? null,
                        })
                    }
                } else {
                    // unresolved: include minimal info so user can see missing
                    const key = normalizeName(ingredientName)
                    if (!ingredientOutMap.has(key)) {
                        ingredientOutMap.set(key, {
                            id: null,
                            name: ingredientName,
                            isAlcoholic: false,
                            typeName: null,
                            subTypeName: null,
                        })
                    }
                    resolvedIngredients.push({ resolved: null, measure, originalName: ingName.trim() })
                }
            }

            // Resolve glass
            const glassId = await resolveGlass(drink.strGlass, glassCache)
            const glassName = drink.strGlass ?? null

            // Infer metadata
            const ingredientNames = resolvedIngredients.map(r => r.resolved ? r.resolved.name : r.originalName)
            const isAlcoholic = drink.strAlcoholic
                ? drink.strAlcoholic.toLowerCase().includes('alcoholic') && !drink.strAlcoholic.toLowerCase().includes('non')
                : true
            const instructionText = drink.strInstructions ?? ''
            const instructions = splitInstructions(drink.strInstructions)
            const techniques = inferTechniquesFromInstructions(instructionText)
            const flavors = inferFlavors(ingredientNames, isAlcoholic)
            const occasions = inferOccasions(ingredientNames, flavors, isAlcoholic)
            const mainAlcoholId = determineMainAlcohol(resolvedIngredients.map(r => r.resolved).filter(Boolean))
            const barTools = determineBarTools(instructions, techniques)
            const complexity = calculateCocktailComplexity({
                ingredientCount: resolvedIngredients.length,
                instructions,
                techniques,
                barTools,
            })
            const { difficulty, preparationTime } = complexity

            // Generate description
            const description = generateCocktailDescription({
                name: drinkName,
                glassName: glassName,
                techniques,
                flavors,
                occasions,
                ingredients: resolvedIngredients.map(r => r.resolved ? r.resolved : { name: r.originalName }),
                isAlcoholic,
                difficulty,
            })

            // Build full cocktail object (kept for completeness)
            const fullCocktail = {
                name: drinkName,
                description,
                instructions,
                imageUrl: drink.strDrinkThumb ?? null,
                isAlcoholic,
                mainAlcoholId,
                source: 'cocktaildb',
                externalId: drink.idDrink,
                difficulty,
                preparationTime,
                technique: techniques,
                flavors,
                occasions,
                glassName,
                glassId,
                ingredients: resolvedIngredients.map(({ resolved, measure, originalName }) => ({
                    name: resolved ? resolved.name : originalName,
                    resolvedId: resolved ? resolved.id : null,
                    amount: measure.amount,
                    unit: measure.unit,
                })),
                barTools,
            }

            // Build simplified cocktail if requested
            const simpleCocktail = {
                name: drinkName,
                description,
                instructions,
                isAlcoholic,
                difficulty,
                preparationTime,
                technique: techniques,
                flavors,
                occasions,
                glassName,
                ingredients: resolvedIngredients.map(({ resolved, measure, originalName }) => ({
                    name: resolved ? resolved.name : originalName,
                    amount: measure.amount,
                    unit: measure.unit,
                    barTools, // include cocktail barTools for each ingredient for convenience
                })),
                barTools,
            }

            cocktailsOut.push(simple ? simpleCocktail : fullCocktail)
        }
    }

    // Merge DB ingredients (ensure all existing DB ingredients included)
    for (const [k, v] of ingredientCache.entries()) {
        if (canonicalizeIngredientName(v.name) !== v.name) continue
        if (!ingredientOutMap.has(k)) {
            ingredientOutMap.set(k, v)
        }
    }

    // Prepare output paths
    const outDir = path.join(process.cwd(), 'prisma', 'seeder')
    const cocktailsPath = path.join(outDir, simple ? 'exported_cocktails_simple.json' : 'exported_cocktails.json')
    const ingredientsPath = path.join(outDir, 'exported_ingredients.json')

    try {
        // Remove internal ids from ingredient export and add subtype name
        const ingredientsArray = Array.from(ingredientOutMap.values()).map((i: any) => ({
            // omit id
            name: i.name,
            isAlcoholic: i.isAlcoholic ?? false,
            typeName: i.typeName ?? null,
            subType: i.subTypeName ?? i.subType ?? null,
        }))

        fs.writeFileSync(cocktailsPath, JSON.stringify(cocktailsOut, null, 2), 'utf8')
        fs.writeFileSync(ingredientsPath, JSON.stringify(ingredientsArray, null, 2), 'utf8')
        console.log(`\n✅ Export completed: ${cocktailsPath} (${cocktailsOut.length} cocktails)`)
        console.log(`✅ Ingredients exported: ${ingredientsPath} (${ingredientsArray.length} ingredients)\n`)
    } catch (err: any) {
        console.error('Failed to write export files:', err.message)
        process.exitCode = 2
    }
}

// ─── MAIN SEEDER LOGIC ────────────────────────────────────────────────────────

// Replace the unconditional runner with a CLI-aware branch so we can run a
// lightweight validation mode that doesn't touch the DB or run the full seed.
async function updateCocktailComplexityOnly({ dryRun }: { dryRun: boolean }) {
    console.log(`Cocktail complexity refresh - Starting${dryRun ? ' (dry run)' : ''}...\n`)

    const cocktails = await prisma.cocktail.findMany({
        where: { source: 'cocktaildb' },
        include: {
            _count: { select: { ingredients: true } },
            barTools: { include: { barTool: true } },
        },
        orderBy: { name: 'asc' },
    })

    let updated = 0
    let unchanged = 0
    const transitions = new Map<string, number>()

    for (const cocktail of cocktails) {
        const instructions = cocktail.instructions.length > 0 ? cocktail.instructions : ['Prepare the drink.']
        const inferredTechniques = inferTechniquesFromInstructions(instructions.join(' '))
        const currentTechniques = (cocktail.technique ?? []) as Technique[]
        const techniques = Array.from(new Set([...currentTechniques, ...inferredTechniques]))
        const existingBarTools = cocktail.barTools.map(({ barTool }) => barTool.name)
        const inferredBarTools = determineBarTools(instructions, techniques)
        const barTools = Array.from(new Set([...existingBarTools, ...inferredBarTools]))
        const complexity = calculateCocktailComplexity({
            ingredientCount: cocktail._count.ingredients,
            instructions,
            techniques,
            barTools,
        })

        const changed = cocktail.difficulty !== complexity.difficulty
            || cocktail.preparationTime !== complexity.preparationTime

        if (!changed) {
            unchanged++
            continue
        }

        updated++
        const transition = `${cocktail.difficulty} -> ${complexity.difficulty}`
        transitions.set(transition, (transitions.get(transition) ?? 0) + 1)
        console.log(
            `  ${dryRun ? 'Would update' : 'Updating'} "${cocktail.name}": `
            + `${cocktail.difficulty}/${cocktail.preparationTime ?? 'null'} min -> `
            + `${complexity.difficulty}/${complexity.preparationTime} min`,
        )

        if (!dryRun) {
            await prisma.cocktail.update({
                where: { id: cocktail.id },
                data: {
                    difficulty: complexity.difficulty,
                    preparationTime: complexity.preparationTime,
                },
            })
        }
    }

    console.log('\n==========================================')
    console.log(`  Cocktail complexity refresh ${dryRun ? 'preview' : 'complete'}`)
    console.log('==========================================')
    console.log(`  Scanned:   ${cocktails.length}`)
    console.log(`  Updated:   ${updated}${dryRun ? ' (preview only)' : ''}`)
    console.log(`  Unchanged: ${unchanged}`)
    if (transitions.size > 0) {
        console.log('  Difficulty transitions:')
        for (const [transition, count] of Array.from(transitions.entries()).sort()) {
            console.log(`    ${transition}: ${count}`)
        }
    }
    console.log('==========================================\n')
}

async function runValidation() {
    const examples = [
        {
            name: 'Mojito',
            ingredients: ['White Rum', 'Sugar', 'Lime Juice', 'Soda Water', 'Mint'],
            isAlcoholic: true,
        },
        {
            name: 'Negroni',
            ingredients: ['Gin', 'Campari', 'Sweet Vermouth'],
            isAlcoholic: true,
        },
        {
            name: 'Espresso Martini',
            ingredients: ['Vodka', 'Kahlua', 'Espresso'],
            isAlcoholic: true,
        },
        {
            name: 'Piña Colada',
            ingredients: ['White Rum', 'Coconut Cream', 'Pineapple Juice'],
            isAlcoholic: true,
        },
        {
            name: 'Virgin Mojito',
            ingredients: ['Lime Juice', 'Sugar', 'Soda Water', 'Mint'],
            isAlcoholic: false,
        },
        {
            name: 'Bloody Mary',
            ingredients: ['Vodka', 'Tomato Juice', 'Worcestershire Sauce', 'Tabasco', 'Celery'],
            isAlcoholic: true,
        },
    ]

    console.log('\n=== Validation: inferFlavors / inferOccasions ===\n')
    for (const ex of examples) {
        const flavors = inferFlavors(ex.ingredients, ex.isAlcoholic)
        const occasions = inferOccasions(ex.ingredients, flavors, ex.isAlcoholic)
        console.log(`Example: ${ex.name}`)
        console.log(`  Ingredients: ${ex.ingredients.join(', ')}`)
        console.log(`  IsAlcoholic: ${ex.isAlcoholic}`)
        console.log(`  Flavors: ${JSON.stringify(flavors)}`)
        console.log(`  Occasions: ${JSON.stringify(occasions)}`)
    }
}

// Run validation, export, complexity refresh, or the normal seeder main()
const args = process.argv.slice(2)
if (args.includes('--validate')) {
    runValidation()
        .catch(err => { console.error('Validation failed:', err); process.exitCode = 2 })
        .finally(() => prisma.$disconnect())
} else if (args.includes('--update-complexity')) {
    updateCocktailComplexityOnly({ dryRun: args.includes('--dry-run') })
        .catch(err => { console.error('Complexity refresh failed:', err); process.exitCode = 2 })
        .finally(() => prisma.$disconnect())
} else if (args.includes('--export')) {
    exportToJson(false)
        .catch(err => { console.error('Export failed:', err); process.exitCode = 2 })
        .finally(() => prisma.$disconnect())
} else if (args.includes('--export-simple')) {
    exportToJson(true)
        .catch(err => { console.error('Export failed:', err); process.exitCode = 2 })
        .finally(() => prisma.$disconnect())
} else {
    main()
        .catch(err => { console.error('Seeding failed:', err); process.exitCode = 2 })
        .finally(() => prisma.$disconnect())
}



