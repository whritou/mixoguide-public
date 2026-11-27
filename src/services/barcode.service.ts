import { prisma } from '@/lib/db/prisma'
import { ValidationError, ForbiddenError } from '@/utils/errors'

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const OFF_FIELDS = 'product_name,product_name_en,brands,quantity,categories_tags,image_front_small_url'
const OFF_USER_AGENT = 'MixoGuide/1.0 (https://mixoguide.app)'

const CACHE_TTL_DAYS = 30

const STOPWORDS = new Set([
    'the', 'and', 'or', 'of', 'a', 'an', 'with', 'in', 'on', 'for',
    'de', 'la', 'le', 'du', 'des', 'au', 'aux', 'et',
])

export interface BarcodeProductInfo {
    productName: string | null
    brand: string | null
    quantity: string | null
    imageUrl: string | null
}

export interface IngredientCandidate {
    id: string
    name: string
    brand: string | null
    imageUrl: string | null
    typeName: string | null
    subTypeName: string | null
}

export interface BarcodeLookupResult {
    barcode: string
    ingredient: IngredientCandidate | null
    candidates: IngredientCandidate[]
    product: BarcodeProductInfo | null
    source: 'cache' | 'off' | 'not-found'
}

function tokenize(input: string | null | undefined): string[] {
    if (!input) return []
    return input
        .toLowerCase()
        .replace(/[^a-z0-9àâäéèêëîïôöùûüç ]+/gi, ' ')
        .split(/\s+/)
        .map(t => t.trim())
        .filter(t => t.length > 2 && !STOPWORDS.has(t))
}

interface OffProduct {
    product_name?: string
    product_name_en?: string
    brands?: string
    quantity?: string
    categories_tags?: string[]
    image_front_small_url?: string
}

async function fetchOpenFoodFacts(barcode: string): Promise<OffProduct | null> {
    try {
        const res = await fetch(`${OFF_BASE}/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`, {
            headers: { 'User-Agent': OFF_USER_AGENT, Accept: 'application/json' },
            signal: AbortSignal.timeout(4000),
        })
        if (!res.ok) return null
        const json = await res.json() as { status?: number; product?: OffProduct }
        if (json.status !== 1 || !json.product) return null
        return json.product
    } catch {
        return null
    }
}

function productInfo(off: OffProduct): BarcodeProductInfo {
    return {
        productName: (off.product_name_en || off.product_name || null)?.trim() || null,
        brand:       (off.brands || null)?.split(',')[0]?.trim() || null,
        quantity:    (off.quantity || null)?.trim() || null,
        imageUrl:    off.image_front_small_url || null,
    }
}

async function findCandidatesByTokens(tokens: string[], limit: number) {
    if (tokens.length === 0) return []
    const where = {
        OR: tokens.flatMap(t => [
            { name: { contains: t, mode: 'insensitive' as const } },
            { brand: { contains: t, mode: 'insensitive' as const } },
        ]),
    }
    const rows = await prisma.ingredient.findMany({
        where,
        select: {
            id: true, name: true, brand: true, imageUrl: true,
            type:    { select: { name: true } },
            subType: { select: { name: true } },
        },
        take: 50,
    })

    const scored = rows.map(r => {
        const haystack = `${r.name} ${r.brand ?? ''}`.toLowerCase()
        const score = tokens.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0)
        return { row: r, score }
    })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score || a.row.name.length - b.row.name.length)
        .slice(0, limit)

    return scored.map(s => ({
        id:          s.row.id,
        name:        s.row.name,
        brand:       s.row.brand,
        imageUrl:    s.row.imageUrl,
        typeName:    s.row.type?.name ?? null,
        subTypeName: s.row.subType?.name ?? null,
        score:       s.score,
    }))
}

function isCacheFresh(lookedUpAt: Date): boolean {
    return Date.now() - lookedUpAt.getTime() < CACHE_TTL_DAYS * 86_400_000
}

class BarcodeService {
    async lookup(barcode: string): Promise<BarcodeLookupResult> {
        const trimmed = barcode.trim()
        if (!/^\d{6,14}$/.test(trimmed)) {
            throw new ValidationError('Invalid barcode format')
        }

        const cached = await prisma.ingredientBarcode.findUnique({
            where: { barcode: trimmed },
            include: {
                ingredient: {
                    select: {
                        id: true, name: true, brand: true, imageUrl: true,
                        type:    { select: { name: true } },
                        subType: { select: { name: true } },
                    },
                },
            },
        })

        if (cached && isCacheFresh(cached.lookedUpAt)) {
            const ingredient = cached.ingredient
                ? {
                    id:          cached.ingredient.id,
                    name:        cached.ingredient.name,
                    brand:       cached.ingredient.brand,
                    imageUrl:    cached.ingredient.imageUrl,
                    typeName:    cached.ingredient.type?.name ?? null,
                    subTypeName: cached.ingredient.subType?.name ?? null,
                }
                : null

            const product: BarcodeProductInfo | null = cached.productName || cached.brand
                ? { productName: cached.productName, brand: cached.brand, quantity: null, imageUrl: null }
                : null

            if (ingredient) {
                return { barcode: trimmed, ingredient, candidates: [], product, source: 'cache' }
            }

            // Cached miss — still re-run candidate search in case the catalog grew.
            const tokens = Array.from(new Set([
                ...tokenize(product?.productName),
                ...tokenize(product?.brand),
            ]))
            const candidates = await findCandidatesByTokens(tokens, 5)
            return { barcode: trimmed, ingredient: null, candidates, product, source: 'cache' }
        }

        const off = await fetchOpenFoodFacts(trimmed)
        if (!off) {
            await prisma.ingredientBarcode.upsert({
                where:  { barcode: trimmed },
                create: { barcode: trimmed, ingredientId: null, productName: null, brand: null },
                update: { lookedUpAt: new Date() },
            })
            return { barcode: trimmed, ingredient: null, candidates: [], product: null, source: 'not-found' }
        }

        const product = productInfo(off)
        const tokens = Array.from(new Set([
            ...tokenize(product.productName),
            ...tokenize(product.brand),
        ]))
        const candidates = await findCandidatesByTokens(tokens, 5)

        const strongUnique =
            candidates.length === 1 ||
            (candidates.length > 1 && candidates[0].score >= candidates[1].score + 2)

        const matchedId = strongUnique && candidates[0] ? candidates[0].id : null

        await prisma.ingredientBarcode.upsert({
            where:  { barcode: trimmed },
            create: {
                barcode:      trimmed,
                ingredientId: matchedId,
                productName:  product.productName,
                brand:        product.brand,
            },
            update: {
                ingredientId: matchedId,
                productName:  product.productName,
                brand:        product.brand,
                lookedUpAt:   new Date(),
            },
        })

        if (matchedId) {
            return {
                barcode:    trimmed,
                ingredient: candidates[0],
                candidates: [],
                product,
                source:     'off',
            }
        }

        return { barcode: trimmed, ingredient: null, candidates, product, source: 'off' }
    }

    /**
     * Record which ingredient a barcode corresponds to. The mapping is shared by
     * every user, so regular users may only fill an *unmapped* barcode; changing an
     * existing mapping requires an admin (SEC-007).
     */
    async confirmMapping(barcode: string, ingredientId: string, actor: { isAdmin: boolean }) {
        const trimmed = barcode.trim()
        if (!/^\d{6,14}$/.test(trimmed)) {
            throw new ValidationError('Invalid barcode format')
        }
        const exists = await prisma.ingredient.findUnique({ where: { id: ingredientId }, select: { id: true } })
        if (!exists) throw new ValidationError('Ingredient not found')

        const current = await prisma.ingredientBarcode.findUnique({
            where: { barcode: trimmed },
            select: { ingredientId: true },
        })
        if (current?.ingredientId && current.ingredientId !== ingredientId && !actor.isAdmin) {
            throw new ForbiddenError('This barcode is already mapped. Use “Suggest a change” to report a wrong match.')
        }
        if (current?.ingredientId === ingredientId) {
            return prisma.ingredientBarcode.findUnique({ where: { barcode: trimmed } })
        }

        return prisma.ingredientBarcode.upsert({
            where:  { barcode: trimmed },
            create: { barcode: trimmed, ingredientId },
            update: { ingredientId, lookedUpAt: new Date() },
        })
    }
}

export const barcodeService = new BarcodeService()
