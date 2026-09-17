/**
 * Test factories — produce realistic domain objects for use in tests.
 * Each factory accepts partial overrides so tests only specify what they care about.
 */

let _seq = 0
function uid(prefix = 'id') { return `${prefix}-${++_seq}` }

// ── Reset counter between test files if needed ──────────────────────────────
export function resetFactoryCounter() { _seq = 0 }

// ── User ────────────────────────────────────────────────────────────────────
export function makeUser(o: Record<string, any> = {}) {
    return {
        id:    uid('user'),
        name:  'Test User',
        email: `user-${_seq}@example.com`,
        role:  'USER' as const,
        ...o,
    }
}

// ── Ingredient ───────────────────────────────────────────────────────────────
export function makeIngredient(o: Record<string, any> = {}) {
    const id = o.id ?? uid('ing')
    return {
        id,
        name:        o.name ?? `Ingredient-${_seq}`,
        isAlcoholic: o.isAlcoholic ?? false,
        unit:        o.unit ?? 'cl',
        typeId:      o.typeId ?? null,
        subTypeId:   o.subTypeId ?? null,
        imageUrl:    o.imageUrl ?? null,
        ...o,
    }
}

// ── Pantry item ───────────────────────────────────────────────────────────────
export function makePantryItem(o: Record<string, any> = {}) {
    return {
        id:               o.id               ?? uid('pi'),
        userId:           o.userId           ?? 'user-1',
        ingredientId:     o.ingredientId     ?? uid('ing'),
        quantity:         o.quantity         ?? 50,
        unitLeft:         o.unitLeft         ?? 'cl',
        favorite:         o.favorite         ?? false,
        isEssential:      o.isEssential      ?? false,
        isInPantry:       o.isInPantry       ?? true,
        isInShoppingList: o.isInShoppingList ?? false,
        addedAt:          o.addedAt          ?? new Date('2026-01-01'),
        updatedAt:        o.updatedAt        ?? new Date('2026-01-01'),
        expirationDate:   o.expirationDate   ?? null,
        note:             o.note             ?? null,
        ingredient:       o.ingredient       ?? null,
    }
}

/** Shorthand: a shopping-list-only item */
export function makeShoppingItem(o: Record<string, any> = {}) {
    return makePantryItem({ ...o, isInPantry: false, isInShoppingList: true })
}

// ── Cocktail ingredient ───────────────────────────────────────────────────────
export function makeCocktailIngredient(ingredientId: string, amount: number | null, unit: string, optional = false) {
    return {
        ingredientId,
        amount,
        unit,
        optional,
        ingredient: { id: ingredientId, name: `Ingredient-${ingredientId}` },
    }
}

// ── Cocktail ─────────────────────────────────────────────────────────────────
export function makeCocktail(o: Record<string, any> = {}) {
    return {
        id:          o.id          ?? uid('cocktail'),
        name:        o.name        ?? `Cocktail-${_seq}`,
        imageUrl:    o.imageUrl    ?? null,
        difficulty:  o.difficulty  ?? 'easy',
        ingredients: o.ingredients ?? [],
        ...o,
    }
}

// ── Planned cocktail ──────────────────────────────────────────────────────────
export function makePlannedCocktail(o: Record<string, any> = {}) {
    return {
        id:          o.id          ?? uid('pc'),
        userId:      o.userId      ?? 'user-1',
        cocktailId:  o.cocktailId  ?? uid('cocktail'),
        quantity:    o.quantity    ?? 1,
        status:      o.status      ?? 'planned',
        plannedFor:  o.plannedFor  ?? new Date('2026-01-15'),
        completedAt: o.completedAt ?? null,
        cocktail:    o.cocktail    ?? null,
    }
}

// ── Planned collection ────────────────────────────────────────────────────────
export function makePlannedCollection(o: Record<string, any> = {}) {
    return {
        id:          o.id          ?? uid('col'),
        userId:      o.userId      ?? 'user-1',
        title:       o.title       ?? `Collection-${_seq}`,
        servings:    o.servings    ?? 1,
        plannedFor:  o.plannedFor  ?? new Date('2026-01-15'),
        completedAt: o.completedAt ?? null,
        status:      o.status      ?? 'planned',
        occasions:   o.occasions   ?? [],
        cocktails:   o.cocktails   ?? [],
    }
}

/** Build a collection entry as returned by findWithCocktails */
export function makeCollectionCocktailEntry(cocktail: ReturnType<typeof makeCocktail>) {
    return { id: uid('cce'), cocktail }
}

// ── GroceryItem (as returned by computeGroceryList) ───────────────────────────
export function makeGroceryItem(o: Record<string, any> = {}) {
    return {
        ingredientId:   o.ingredientId   ?? uid('ing'),
        ingredientName: o.ingredientName ?? `Ingredient-${_seq}`,
        totalNeeded:    o.totalNeeded    ?? 10,
        unit:           o.unit           ?? 'cl',
        inPantry:       o.inPantry       ?? 0,
        missing:        o.missing        ?? 10,
        inWishlist:     o.inWishlist     ?? false,
    }
}
