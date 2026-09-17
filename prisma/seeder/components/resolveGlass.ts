import {normalizeName} from "./utils";
import {GLASS_NAME_MAP} from "./constants";
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function resolveGlass(
    glassName: string | null,
    glassCache: Map<string, string>,
): Promise<string | null> {
    if (!glassName?.trim()) return null

    const normalized = normalizeName(glassName)

    // Check cache
    if (glassCache.has(normalized)) return glassCache.get(normalized)!

    // Check mapping
    const mappedName = GLASS_NAME_MAP[normalized]
    if (mappedName) {
        const glass = await prisma.glass.findFirst({ where: { name: mappedName } })
        if (glass) {
            glassCache.set(normalized, glass.id)
            return glass.id
        }
    }

    // Try direct DB lookup
    const existing = await prisma.glass.findFirst({
        where: { name: { equals: glassName.trim(), mode: 'insensitive' } },
    })
    if (existing) {
        glassCache.set(normalized, existing.id)
        return existing.id
    }

    // Create new glass
    const created = await prisma.glass.create({
        data: { name: glassName.trim() },
    })
    glassCache.set(normalized, created.id)
    console.log(`  + Created glass: "${glassName.trim()}"`)
    return created.id
}