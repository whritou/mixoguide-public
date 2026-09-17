import type { QueryParams, FilterValue } from '@/lib/query/types'

// Reserved param keys that are NOT filters
const RESERVED_KEYS = new Set([
  'page', 'limit', 'offset', 'cursor',
  'sortBy', 'sortOrder',
  'search',
  'include',
  'minimal', 'fields',
])

// Alias mapping: frontend param name → Prisma field name
const FILTER_ALIASES: Record<string, string> = {
  alcoholic: 'isAlcoholic',
}

export function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  const params: QueryParams = {}

  // Pagination
  if (searchParams.has('page')) params.page = Number(searchParams.get('page'))
  if (searchParams.has('limit')) params.limit = Number(searchParams.get('limit'))
  if (searchParams.has('offset')) params.offset = Number(searchParams.get('offset'))
  if (searchParams.has('cursor')) params.cursor = searchParams.get('cursor') ?? undefined

  // Tri
  if (searchParams.has('sortBy')) params.sortBy = searchParams.get('sortBy') ?? undefined
  if (searchParams.has('sortOrder')) {
    const order = searchParams.get('sortOrder')
    params.sortOrder = order === 'asc' ? 'asc' : 'desc'
  }

  // Search
  if (searchParams.has('search')) {
    const raw = searchParams.get('search') ?? ''
    params.search = raw.slice(0, 200) || undefined
  }

  // Includes: ?include=author&include=comments → ['author', 'comments']
  const includes = searchParams.getAll('include')
  if (includes.length > 0) params.include = includes

  // Filtres: ?filter[status]=ACTIVE&filter[role]=ADMIN
  const filters: Record<string, FilterValue> = {}
  for (const [key, value] of searchParams.entries()) {
    // Explicit filter format:
    // - ?filter[status]=planned
    // - ?filter[plannedFor][lt]=2026-04-20T00:00:00.000Z
    const filterMatch = key.match(/^filter\[([^\]]+)\](?:\[([^\]]+)\])?$/)
    if (filterMatch) {
      const [, field, op] = filterMatch

      if (op) {
        const current = filters[field]
        const currentObj =
          current && typeof current === 'object' && !Array.isArray(current)
            ? current as Record<string, unknown>
            : {}
        filters[field] = { ...currentObj, [op]: parseValue(value) }
      } else {
        filters[field] = parseValue(value)
      }
      continue
    }

    // Flat params: treat non-reserved params as filters
    if (!RESERVED_KEYS.has(key) && !key.startsWith('filter[')) {
      const fieldName = FILTER_ALIASES[key] ?? key
      filters[fieldName] = parseValue(value)
    }
  }
  if (Object.keys(filters).length > 0) params.filters = filters

  return params
}

function parseValue(value: string): string | number | boolean | null {
  if (value === 'null') return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (!isNaN(Number(value)) && value !== '') return Number(value)
  return value
}
