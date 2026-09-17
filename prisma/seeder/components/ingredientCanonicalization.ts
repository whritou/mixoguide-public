/**
 * Canonical ingredient names used by seed/export/maintenance scripts.
 *
 * Keep this list intentionally conservative: entries here are aliases that
 * should collapse into one pantry/cocktail ingredient in production data.
 * Styles that materially change a drink, such as Rye Whiskey vs Irish whiskey,
 * should stay separate.
 */
export const INGREDIENT_CANONICAL_NAMES: Record<string, string> = {
    // User-reported duplicates / near-duplicates.
    'Baileys irish cream': 'Irish cream',
    "Bailey's Irish Cream": 'Irish cream',
    'Absolut Vodka': 'Vodka',
    'Jack Daniels': 'Tennessee whiskey',
    'Whisky': 'Whiskey',
    'Pepper': 'Black pepper',
    'Powdered sugar': 'Sugar',
    'Soda Water': 'Club soda',
    'Carbonated water': 'Club soda',
    'Sparkling water': 'Club soda',
    'Seltzer': 'Club soda',
    'Vermouth': 'Dry Vermouth',
    'Dry wermouth': 'Dry Vermouth',
    'Rosso Vermouth': 'Sweet Vermouth',

    // Brand names where the CocktailDB entry is only a branded variant.
    'Absolut Citron': 'Citrus vodka',
    'Absolut Kurant': 'Blackcurrant vodka',
    'Absolut Peppar': 'Pepper vodka',

    // Spelling/accent/case duplicates.
    'Jägermeister': 'Jagermeister',
    'Jagermeister': 'Jagermeister',

    // Fresh/bottled wording should not create separate pantry ingredients.
    'Fresh Lemon Juice': 'Lemon Juice',
    'Fresh Lime Juice': 'Lime Juice',

    // Common branded or alternate wording that maps cleanly to an existing
    // generic style without losing cocktail semantics.
    'Peachtree schnapps': 'Peach schnapps',
    'Midori melon liqueur': 'Melon Liqueur',
    'Lillet': 'Lillet Blanc',
    'Sweet and Sour': 'Sour mix',
    'Kahlua': 'Coffee liqueur',
    'Kahlúa': 'Coffee liqueur',
    'Tia maria': 'Coffee liqueur',
}

export function normalizeIngredientKey(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
}

const CANONICAL_NAME_BY_KEY = new Map(
    Object.entries(INGREDIENT_CANONICAL_NAMES)
        .map(([alias, canonical]) => [normalizeIngredientKey(alias), canonical] as const),
)

export function canonicalizeIngredientName(name: string): string {
    const trimmed = name.trim().replace(/\s+/g, ' ')
    return CANONICAL_NAME_BY_KEY.get(normalizeIngredientKey(trimmed)) ?? trimmed
}

export function isCanonicalIngredientAlias(name: string): boolean {
    return canonicalizeIngredientName(name) !== name.trim().replace(/\s+/g, ' ')
}

export function getIngredientCanonicalPairs(): Array<{ alias: string; canonical: string }> {
    return Object.entries(INGREDIENT_CANONICAL_NAMES)
        .map(([alias, canonical]) => ({ alias, canonical }))
        .filter(({ alias, canonical }) => alias.trim() !== canonical)
        .sort((a, b) => a.canonical.localeCompare(b.canonical) || a.alias.localeCompare(b.alias))
}
