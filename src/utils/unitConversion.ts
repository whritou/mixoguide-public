export type UnitConversionContext = {
    ingredientName?: string | null
    typeName?: string | null
    subTypeName?: string | null
    isAlcoholic?: boolean | null
}

const LIQUID_TO_ML: Record<string, number> = {
    ml: 1,
    cl: 10,
    oz: 29.5735295625,
}

const WEIGHT_TO_G: Record<string, number> = {
    g: 1,
    kg: 1000,
    lb: 453.592,
}

const SMALL_TO_ML: Record<string, number> = {
    dash: 0.92,
    drop: 0.05,
    barspoon: 5,
    bsp: 5,
}

const PIECE_EQ: Record<string, number> = {
    pcs: 1,
    zest: 1,
    slice: 1,
    twist: 1,
}

const ALCOHOL_KEYWORDS = [
    'vodka', 'gin', 'rum', 'whiskey', 'whisky', 'bourbon', 'cognac', 'brandy',
    'tequila', 'mezcal', 'scotch', 'vermouth', 'amaro', 'liqueur', 'curacao',
    'sambuca', 'campari', 'aperol', 'ouzo', 'pernod', 'chartreuse', 'absinthe',
    'drambuie', 'jagermeister', 'kahlua', 'st germain', 'triple sec', 'cointreau',
    'grand marnier', 'port', 'sherry', 'wine', 'prosecco', 'champagne', 'beer',
    'cider', 'guinness', 'lager',
]

const SYRUP_KEYWORDS = [
    'syrup', 'sirup', 'cordial', 'grenadine', 'orgeat', 'falernum', 'honey',
    'agave', 'maple', 'molasses', 'demerara', 'corn syrup', 'caramel', 'sweetener',
    'pina colada mix', 'daiquiri mix', 'rose',
]

const CREAMY_KEYWORDS = [
    'cream', 'milk', 'half-and-half', 'half and half', 'yoghurt', 'yogurt',
    'ice cream', 'ice-cream', 'coconut milk', 'coconut cream', 'condensed milk',
    'whipping cream', 'heavy cream', 'light cream', 'egg',
]

const WATERY_KEYWORDS = [
    'juice', 'water', 'soda', 'cola', 'lemonade', 'limeade', 'tonic', 'tea',
    'coffee', 'espresso', 'hot chocolate', 'soft drink', 'fruit punch', 'kool-aid',
]

const HIGH_SUGAR_OR_VISCOSITY_KEYWORDS = [
    'honey', 'maple', 'corn syrup', 'demerara', 'caramel', 'sugar syrup',
    'sugar', 'condensed milk', 'orgeat', 'grenadine', 'passion fruit syrup', 'mint syrup',
    'ginger syrup', 'vanilla syrup', 'rose syrup', 'pineapple syrup',
]

const ALCOHOL_TYPE_HINTS = [
    'spirit', 'liqueur', 'fortified wine', 'amaro', 'aperitif', 'digestif',
]

function normalizeUnit(unit: string): string {
    return unit.trim().toLowerCase()
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function toFixed2(value: number): number {
    return +value.toFixed(2)
}

function toMl(amount: number, unit: string): number | null {
    const liquidFactor = LIQUID_TO_ML[unit]
    if (liquidFactor != null) return amount * liquidFactor

    const smallFactor = SMALL_TO_ML[unit]
    if (smallFactor != null) return amount * smallFactor

    return null
}

function fromMl(amountMl: number, unit: string): number | null {
    const liquidFactor = LIQUID_TO_ML[unit]
    if (liquidFactor != null) return amountMl / liquidFactor

    const smallFactor = SMALL_TO_ML[unit]
    if (smallFactor != null) return amountMl / smallFactor

    return null
}

function toGrams(amount: number, unit: string): number | null {
    const weightFactor = WEIGHT_TO_G[unit]
    if (weightFactor == null) return null
    return amount * weightFactor
}

function fromGrams(amountGrams: number, unit: string): number | null {
    const weightFactor = WEIGHT_TO_G[unit]
    if (weightFactor == null) return null
    return amountGrams / weightFactor
}

function includesAny(haystack: string, needles: string[]): boolean {
    const normalizedHaystack = normalizeText(haystack)
    return needles.some(needle => normalizedHaystack.includes(normalizeText(needle)))
}

function resolveDensityGPerMl(context?: UnitConversionContext): number {
    if (!context) return 1

    const text = normalizeText([
        context.ingredientName ?? '',
        context.typeName ?? '',
        context.subTypeName ?? '',
    ].join(' '))

    const hasAlcoholType = includesAny(text, ALCOHOL_TYPE_HINTS)
    const hasAlcoholWord = includesAny(text, ALCOHOL_KEYWORDS)

    if (context.isAlcoholic === true || hasAlcoholType || hasAlcoholWord) {
        return 0.97
    }

    if (includesAny(text, HIGH_SUGAR_OR_VISCOSITY_KEYWORDS)) {
        return 1.28
    }

    if (includesAny(text, SYRUP_KEYWORDS)) {
        return 1.22
    }

    if (includesAny(text, CREAMY_KEYWORDS)) {
        if (text.includes('ice cream')) return 0.6
        return 1.03
    }

    if (includesAny(text, WATERY_KEYWORDS)) {
        return 1
    }

    return 1
}

/**
 * Convert an amount between units.
 * Supports:
 * - liquid: ml, cl, oz
 * - weight: g, kg, lb
 * - small bar units: dash, drop, barspoon, bsp
 * - piece-like units: pcs, zest, slice, twist (1:1 family conversion)
 * - cross liquid<->weight with ingredient-aware density heuristics
 */
export function convertUnit(
    amount: number,
    from: string,
    to: string,
    context?: UnitConversionContext
): number | null {
    const fromUnit = normalizeUnit(from)
    const toUnit = normalizeUnit(to)
    if (fromUnit === toUnit) return amount

    // piece-like units convert 1:1 inside the same family
    if (PIECE_EQ[fromUnit] != null && PIECE_EQ[toUnit] != null) {
        return toFixed2(amount * (PIECE_EQ[fromUnit] / PIECE_EQ[toUnit]))
    }

    const fromAsMl = toMl(amount, fromUnit)
    if (fromAsMl != null) {
        const directLiquid = fromMl(fromAsMl, toUnit)
        if (directLiquid != null) return toFixed2(directLiquid)
    }

    const fromAsGrams = toGrams(amount, fromUnit)
    if (fromAsGrams != null) {
        const directWeight = fromGrams(fromAsGrams, toUnit)
        if (directWeight != null) return toFixed2(directWeight)
    }

    // Cross convert via density (g/ml) for ingredient-aware liquid<->weight
    const density = resolveDensityGPerMl(context)

    if (fromAsGrams != null) {
        const asMl = fromAsGrams / density
        const crossToLiquid = fromMl(asMl, toUnit)
        if (crossToLiquid != null) return toFixed2(crossToLiquid)
    }

    if (fromAsMl != null) {
        const asGrams = fromAsMl * density
        const crossToWeight = fromGrams(asGrams, toUnit)
        if (crossToWeight != null) return toFixed2(crossToWeight)
    }

    return null
}

/**
 * Round scaled ingredient amounts to practical bar values.
 */
export function roundForServings(amount: number, unit: string): number {
    if (unit === 'oz') return Math.round(amount * 10) / 10
    if (unit === 'cl') return Math.round(amount * 2) / 2
    if (unit === 'ml') return Math.round(amount / 5) * 5
    return Math.round(amount)
}
