import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeName(name: string) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
}

// 👉 TON LOGIC (copiée telle quelle)
function resolveUnit(ingredientName: string, typeName: string): string {
    const name = normalizeName(ingredientName)

    if (typeName === 'Garnish') {
        if (name.includes('zest') || name.includes('peel')) return 'zest'
        if (name.includes('slice') || name.includes('wedge')) return 'slice'
        return 'pcs'
    }

    if (typeName === 'Fresh Produce') {
        if (name.includes('zest') || name.includes('peel')) return 'zest'
        if (name.includes('slice') || name.includes('wedge')) return 'slice'
        if (name.includes('juice')) return 'ml'
        return 'pcs'
    }

    if (typeName === 'Juice') return 'ml'
    if (typeName === 'Sweetener') return 'ml'
    if (typeName === 'Bitters') return 'ml'

    if (
        typeName === 'Spirit' ||
        typeName === 'Liqueur' ||
        typeName === 'Wine' ||
        typeName === 'Fortified Wine' ||
        typeName === 'Beer & Cider'
    ) {
        return 'cl'
    }

    if (typeName === 'Dairy & Egg') {
        if (name.includes('egg')) return 'pcs'
        return 'ml'
    }

    if (typeName === 'Carbonated Mixer') return 'ml'

    if (
        name.includes('sugar') ||
        name.includes('salt') ||
        name.includes('powder')
    ) {
        return 'g'
    }

    return 'ml'
}

async function main() {
    const ingredients = await prisma.ingredient.findMany({
        include: { type: true },
    })

    console.log(`Found ${ingredients.length} ingredients`)

    let updated = 0

    for (const ing of ingredients) {
        const newUnit = resolveUnit(ing.name, ing.type.name)

        // ⚡ skip si identique
        if ((ing as any).unit === newUnit) continue

        await prisma.ingredient.update({
            where: { id: ing.id },
            data: { unit: newUnit as any },
        })

        console.log(`✔ ${ing.name}: ${(ing as any).unit ?? 'null'} → ${newUnit}`)
        updated++
    }

    console.log(`\nDone. Updated ${updated} ingredients.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })