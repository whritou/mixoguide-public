export type SortOption   = 'stock-asc' | 'stock-desc' | 'name-asc' | 'name-desc';
export type ScopeFilter = 'all' | 'in-pantry' | 'shopping';
export type StockStatusFilter = 'all' | 'low-stock' | 'out-of-stock' | 'expiring';
export type StatusFilter = ScopeFilter | StockStatusFilter;

export const SCOPE_FILTERS: ScopeFilter[] = ['all', 'in-pantry', 'shopping'];
export const STOCK_STATUS_FILTERS: StockStatusFilter[] = ['all', 'low-stock', 'out-of-stock', 'expiring'];

export const SORT_LABELS: Record<SortOption, string> = {
    'stock-asc':  'Low to high stock',
    'stock-desc': 'High to low stock',
    'name-asc':   'Name A to Z',
    'name-desc':  'Name Z to A',
};

export const SORT_PARAMS: Record<SortOption, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
    'name-asc':   { sortBy: 'ingredient.name', sortOrder: 'asc'  },
    'name-desc':  { sortBy: 'ingredient.name', sortOrder: 'desc' },
    'stock-asc':  { sortBy: 'quantity',        sortOrder: 'asc'  },
    'stock-desc': { sortBy: 'quantity',        sortOrder: 'desc' },
};

export const SORT_OPTIONS: SortOption[] = ['name-asc', 'name-desc', 'stock-asc', 'stock-desc'];

export const STATUS_LABELS: Record<StatusFilter, string> = {
    'all':          'All',
    'in-pantry':    'In pantry',
    'shopping':     'Shopping list',
    'low-stock':    'Low stock',
    'out-of-stock': 'Out of stock',
    'expiring':     'Expiring soon',
};

export const LOW_THRESHOLDS: Record<string, number> = {
    cl: 10, ml: 100, oz: 3.4, g: 50,
    pcs: 2, zest: 2, slice: 2, twist: 2,
};

export function stockStatus(qty: number, unit: string): 'out' | 'low' | 'ok' {
    if (qty === 0) return 'out';
    return qty <= (LOW_THRESHOLDS[unit] ?? 5) ? 'low' : 'ok';
}

export function deriveSortOption(sortBy?: string, sortOrder?: string): SortOption {
    if (sortBy === 'quantity'        && sortOrder === 'asc')  return 'stock-asc';
    if (sortBy === 'quantity'        && sortOrder === 'desc') return 'stock-desc';
    if (sortBy === 'ingredient.name' && sortOrder === 'asc')  return 'name-asc';
    if (sortBy === 'ingredient.name' && sortOrder === 'desc') return 'name-desc';
    return 'name-asc';
}
