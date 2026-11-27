import { describe, expect, it } from 'vitest'
import { QueryBuilder, SAFE_USER_SELECT } from '@/lib/query/QueryBuilder'

/**
 * Regression tests for SEC-001/SEC-002: client-supplied `include` paths must
 * never reach user rows (password hashes, emails, OAuth tokens).
 */
describe('QueryBuilder.buildIncludeArgs', () => {
    const allowed = ['glass', 'ingredients', 'ingredients.type', 'cocktails', 'user']

    it('honours exact allow-listed paths only', () => {
        expect(QueryBuilder.buildIncludeArgs({ include: ['glass'] }, allowed)).toEqual({ include: { glass: true } })
        expect(QueryBuilder.buildIncludeArgs({ include: ['ingredients.type'] }, allowed))
            .toEqual({ include: { ingredients: { include: { type: true } } } })
    })

    it.each([
        'favoritedBy.user',
        'favoritedBy.user.accounts',
        'cocktails.favoritedBy.user',
        'ingredients.pantryItems.user',
        'glass.cocktails',
        'pantryItems',
        'accounts',
    ])('rejects non-allow-listed path %s (no prefix matching)', (path) => {
        expect(QueryBuilder.buildIncludeArgs({ include: [path] }, allowed)).toEqual({})
    })

    it('projects any user relation to the safe public shape and never traverses past it', () => {
        const args = QueryBuilder.buildIncludeArgs({ include: ['user'] }, allowed)
        expect(args).toEqual({ include: { user: SAFE_USER_SELECT } })
        expect(Object.keys(SAFE_USER_SELECT.select).sort()).toEqual(['id', 'image', 'name'])
    })

    it('ignores user sub-paths even when listed by mistake', () => {
        const args = QueryBuilder.buildIncludeArgs({ include: ['user.accounts'] }, ['user.accounts'])
        expect(args).toEqual({ include: { user: SAFE_USER_SELECT } })
    })
})

describe('public repository allow-lists', () => {
    // Relations that lead from catalog data to user-owned data.
    const USER_REACHING = ['favoritedBy', 'pantryItems', 'accounts', 'ratings', 'madeLogs', 'plannedCocktails', 'devices']

    it.each([
        ['cocktail', () => import('@/repositories/cocktail.repository').then((m) => m.cocktailRepository)],
        ['bar tool', () => import('@/repositories/bartool.repository').then((m) => m.barToolRepository)],
        ['ingredient type', () => import('@/repositories/ingredient-type.repository').then((m) => m.ingredientTypeRepository)],
        ['ingredient sub-type', () => import('@/repositories/ingredient-subtype.repository').then((m) => m.ingredientSubTypeRepository)],
    ])('%s repository exposes no user-reaching include', async (_name, load) => {
        const repo = await load() as unknown as { config: { allowedIncludes: string[] } }
        for (const include of repo.config.allowedIncludes) {
            for (const segment of include.split('.')) expect(USER_REACHING).not.toContain(segment)
        }
    })
})
