import { unstable_cache } from 'next/cache'
import { headers } from 'next/headers'
import { decodeBarParam, encodeBarParam } from '@/lib/demo-bar/bar-param'
import { DEMO_BOTTLES } from '@/lib/demo-bar/demo-bottles'
import { env } from '@/lib/env'
import { checkRateLimit, getIp } from '@/lib/rateLimit'
import { cocktailService } from '@/services/cocktail.service'
import { ingredientService } from '@/services/ingredient.service'
import type { MakeablePreview } from '@/types/models/cocktail'

const CACHE_SECONDS = 10 * 60

export type SharedBar = {
    ids: string[]
    param: string
    preview: MakeablePreview | null
    bottleImages: string[]
}

const EMPTY: SharedBar = { ids: [], param: '', preview: null, bottleImages: [] }

export function firstParam(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value
}

export function absoluteUrl(path: string): string {
    return `${env.NEXT_PUBLIC_BASE_URL.replace(/\/+$/, '')}${path}`
}

async function bottleImagesFor(ids: string[]): Promise<string[]> {
    const idByName = await ingredientService.findIdsByNames(DEMO_BOTTLES.map(b => b.ingredientName))
    return DEMO_BOTTLES.filter(b => ids.includes(idByName[b.ingredientName])).map(b => b.image)
}

const loadCanonical = unstable_cache(
    async (param: string): Promise<SharedBar> => {
        const ids = decodeBarParam(param)
        const preview = await cocktailService.previewMakeable(ids, 0)
        if (preview.makeableCount === 0) return EMPTY
        return { ids, param, preview, bottleImages: await bottleImagesFor(ids) }
    },
    ['shared-bar'],
    { revalidate: CACHE_SECONDS },
)

export async function loadSharedBar(param: string | undefined): Promise<SharedBar> {
    const ids = decodeBarParam(param)
    if (ids.length === 0) return EMPTY
    try {
        return await loadCanonical(encodeBarParam(ids))
    } catch {
        return EMPTY
    }
}

export async function loadRateLimitedBar(param: string | undefined): Promise<SharedBar> {
    try {
        await checkRateLimit('makeable-preview', getIp(await headers()))
    } catch {
        return EMPTY
    }
    return loadSharedBar(param)
}
