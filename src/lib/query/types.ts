export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
  cursor?: string // Cursor-based pagination alternative
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchParams {
  search?: string
  searchFields?: string[]
}

export interface FilterParams {
  filters?: Record<string, FilterValue>
}

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | { eq?: unknown; neq?: unknown; gt?: unknown; gte?: unknown; lt?: unknown; lte?: unknown; in?: unknown[]; like?: string; between?: [unknown, unknown] }

export interface IncludeParams {
  include?: string[] // ex: ['author', 'author.profile', 'comments']
}

export interface QueryParams
  extends PaginationParams,
    SortParams,
    SearchParams,
    FilterParams,
    IncludeParams {
  /** Extra Prisma where conditions injected by route handlers (e.g. relation filters) */
  extraWhere?: Record<string, unknown>
  /** Fields to select (if provided, include is ignored — Prisma doesn't allow both) */
  select?: string[]
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export interface CursorPaginatedResult<T> {
  data: T[]
  meta: {
    nextCursor: string | null
    prevCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}
