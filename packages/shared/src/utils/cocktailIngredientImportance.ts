export type CocktailIngredientImportanceInput = {
    optional?: boolean | null
    amount?: number | null
    unit?: string | null
    ingredient?: {
        name?: string | null
        type?: { name?: string | null } | null
        subType?: { name?: string | null } | null
    } | null
}

const NON_BLOCKING_UNITS = new Set(['twist', 'zest', 'slice'])

function normalize(value?: string | null) {
    return value?.toLowerCase().trim() ?? ''
}

function includesAny(value: string, words: string[]) {
    return words.some((word) => value.includes(word))
}

export function isNonBlockingCocktailIngredient(row: CocktailIngredientImportanceInput): boolean {
    if (row.optional) return true
    if (row.amount == null) return true

    const unit = normalize(row.unit)
    if (NON_BLOCKING_UNITS.has(unit)) return true

    const ingredient = row.ingredient
    const name = normalize(ingredient?.name)
    const type = normalize(ingredient?.type?.name)
    const subType = normalize(ingredient?.subType?.name)

    if (name.includes('brine')) return false
    if (type === 'garnish') return true

    if (includesAny(subType, ['garnish', 'twist', 'peel', 'wheel', 'slice', 'wedge', 'sprig', 'rim'])) {
        return true
    }

    return includesAny(name, [' peel', ' twist', ' wedge', ' wheel', ' sprig'])
}

export function isBlockingCocktailIngredient(row: CocktailIngredientImportanceInput): boolean {
    return !isNonBlockingCocktailIngredient(row)
}
