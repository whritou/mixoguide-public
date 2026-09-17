import { afterEach, describe, expect, it, vi } from 'vitest'

describe('CocktailDB seeder env loading', () => {
    afterEach(() => {
        vi.doUnmock('dotenv')
        vi.resetModules()
        delete process.env.COCKTAILDB_API_KEY
    })

    it('does not require dotenv when the API key is already in the environment', async () => {
        vi.doMock('dotenv', () => {
            throw new Error('dotenv is not installed')
        })
        process.env.COCKTAILDB_API_KEY = 'prod-key'

        const { cocktailDbApiUrl } = await import('../../prisma/seeder/components/cocktailDb')

        expect(cocktailDbApiUrl('search.php', { f: 'a' })).toBe(
            'https://www.thecocktaildb.com/api/json/v2/prod-key/search.php?f=a'
        )
    })
})
