import path from 'path'

function loadLocalEnvFiles() {
    try {
        const dotenv = require('dotenv') as { config: (options: { path: string }) => void }
        dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
        dotenv.config({ path: path.resolve(process.cwd(), '.env') })
    } catch {
        // Production standalone images may not include dotenv. In that case,
        // environment variables should already be provided by the platform.
    }
}

loadLocalEnvFiles()

const COCKTAILDB_API_ROOT = 'https://www.thecocktaildb.com/api/json/v2'

function requireCocktailDbApiKey(): string {
    const apiKey = process.env.COCKTAILDB_API_KEY?.trim()

    if (!apiKey) {
        throw new Error('Missing required environment variable: COCKTAILDB_API_KEY')
    }

    return apiKey
}

export function cocktailDbApiUrl(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {},
): string {
    const safeEndpoint = endpoint.replace(/^\/+/, '')
    const url = new URL(`${COCKTAILDB_API_ROOT}/${encodeURIComponent(requireCocktailDbApiKey())}/${safeEndpoint}`)

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value))
        }
    }

    return url.toString()
}
