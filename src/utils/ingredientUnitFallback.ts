export const MEASURE_UNITS = ['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'] as const

export type MeasureUnitLike = (typeof MEASURE_UNITS)[number]

type UnitFallbackInput = {
    defaultUnit?: string | null
    ingredientName?: string | null
    typeName?: string | null
    subTypeName?: string | null
    isAlcoholic?: boolean | null
    fallback?: MeasureUnitLike
}

function normalize(text?: string | null): string {
    if (!text) return ''
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
}

function asMeasureUnit(value?: string | null): MeasureUnitLike | null {
    if (!value) return null
    return (MEASURE_UNITS as readonly string[]).includes(value)
        ? (value as MeasureUnitLike)
        : null
}

function includesOne(haystack: string, needles: string[]): boolean {
    return needles.some((needle) => haystack.includes(needle))
}

export function resolveIngredientUnitFallback(input: UnitFallbackInput): MeasureUnitLike {
    const defaultUnit = asMeasureUnit(input.defaultUnit)
    if (defaultUnit) return defaultUnit

    const name = normalize(input.ingredientName)
    const type = normalize(input.typeName)
    const subType = normalize(input.subTypeName)

    const isGarnishType = type === 'garnish' || type.includes('garnish')
    const isFreshProduceType = type === 'fresh produce' || type.includes('fresh produce')
    const isAlcoholType =
        includesOne(type, ['spirit', 'liqueur', 'wine', 'beer', 'cider']) || input.isAlcoholic === true
    const isLiquidType = includesOne(type, ['juice', 'sweetener', 'bitters', 'carbonated mixer'])
    const isLiquidSubType = includesOne(subType, ['juice', 'syrup'])
    const isPowderLike = includesOne(name, ['sugar', 'salt', 'powder'])

    if (isGarnishType) {
        if (includesOne(name, ['zest'])) return 'zest'
        if (includesOne(name, ['twist', 'peel'])) return 'twist'
        if (includesOne(name, ['slice', 'wedge', 'wheel'])) return 'slice'
        return 'pcs'
    }

    if (isFreshProduceType) {
        if (includesOne(name, ['zest'])) return 'zest'
        if (includesOne(name, ['twist', 'peel'])) return 'twist'
        if (includesOne(name, ['slice', 'wedge', 'wheel'])) return 'slice'
        if (name.includes('juice')) return 'ml'
        return 'pcs'
    }

    if (isLiquidType || isLiquidSubType) return 'ml'
    if (isAlcoholType) return 'cl'

    if (type === 'dairy & egg' || type.includes('dairy') || type.includes('egg')) {
        if (name.includes('egg')) return 'pcs'
        return 'ml'
    }

    if (isPowderLike) return 'g'

    return input.fallback ?? 'pcs'
}

