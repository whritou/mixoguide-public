export function hasIngredientFilters(params: URLSearchParams): boolean {
  const ignorable = new Set(['limit', 'offset', 'sort']);
  return Array.from(params.keys()).some(key =>
    !ignorable.has(key) && params.get(key)?.trim() !== ''
  );
}

export function hasCocktailFilters(params: URLSearchParams): boolean {
  const ignorable = new Set(['limit', 'offset', 'sort']);
  return Array.from(params.keys()).some(key =>
    !ignorable.has(key) && params.get(key)?.trim() !== ''
  );
}

export const hasPantryFilters = (p:URLSearchParams) =>
  ['search','unit','isEssential','isInPantry','isInShoppingList','favorite']
    .some(k => p.get(k));

export const hasMakeableFilters = (p: URLSearchParams) =>
  ['search', 'difficulty', 'flavors', 'availability']
    .some(k => p.get(k));
