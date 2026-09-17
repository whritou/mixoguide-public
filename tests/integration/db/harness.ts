import { prisma } from '@/lib/db/prisma'

let sequence = 0

function nextId(prefix: string) {
    sequence += 1
    return `${prefix}-${sequence}`
}

export function ensureTestDatabaseUrl() {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL
    if (!testDatabaseUrl) {
        throw new Error('TEST_DATABASE_URL is required for DB integration tests.')
    }
}

export async function resetDatabase() {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    `

    const tableNames = tables
        .map((row) => row.tablename)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)

    if (tableNames.length === 0) return

    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE;`)
}

export async function createUser() {
    const suffix = nextId('user')
    return prisma.user.create({
        data: {
            email: `${suffix}@example.com`,
            name: `User ${suffix}`,
            role: 'USER',
            password: 'hashed-password',
            emailVerified: new Date('2026-01-01T00:00:00.000Z'),
        },
    })
}

export async function createIngredientType() {
    const suffix = nextId('type')
    return prisma.ingredientType.create({
        data: { name: `Type ${suffix}` },
    })
}

export async function createIngredient() {
    const type = await createIngredientType()
    const suffix = nextId('ingredient')
    return prisma.ingredient.create({
        data: {
            name: `Ingredient ${suffix}`,
            typeId: type.id,
            unit: 'ml',
            isAlcoholic: false,
        },
    })
}

export async function createCocktail() {
    const suffix = nextId('cocktail')
    return prisma.cocktail.create({
        data: {
            name: `Cocktail ${suffix}`,
            instructions: ['Stir with ice'],
            technique: [],
            flavors: [],
            occasions: [],
            difficulty: 'easy',
            source: 'custom',
            isAlcoholic: true,
        },
    })
}

