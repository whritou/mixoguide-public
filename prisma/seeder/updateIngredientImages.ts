import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const ingredients = await prisma.ingredient.findMany({ select: { id: true, name: true } })
    console.log(`Updating images for ${ingredients.length} ingredients...`)

    let updated = 0
    for (const ing of ingredients) {
        const imageUrl = `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(ing.name)}-Medium.png`
        await prisma.ingredient.update({ where: { id: ing.id }, data: { imageUrl } })
        updated++
    }

    console.log(`✓ Updated ${updated} ingredient images.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
