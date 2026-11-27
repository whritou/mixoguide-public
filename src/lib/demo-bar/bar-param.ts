const MAX_IDS = 40
const MAX_ID_LENGTH = 64
const MAX_PARAM_LENGTH = 2000

function toBase64Url(text: string): string {
    return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(param: string): string {
    const padded = param.replace(/-/g, '+').replace(/_/g, '/')
    return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
}

export function encodeBarParam(ids: string[]): string {
    return toBase64Url([...new Set(ids)].sort().join('.'))
}

export function decodeBarParam(param: string | null | undefined): string[] {
    if (!param || param.length > MAX_PARAM_LENGTH) return []
    try {
        const ids = fromBase64Url(param).split('.').filter(id => id.length > 0 && id.length <= MAX_ID_LENGTH)
        return [...new Set(ids)].slice(0, MAX_IDS)
    } catch {
        return []
    }
}
