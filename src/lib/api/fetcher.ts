import type { ListParams } from '@/lib/query-keys'

export interface Paginated<T> {
    data: T[]
    meta: { total?: number; page?: number; limit?: number }
}

export interface Single<T> {
    data: T
}

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message)
        this.name = 'ApiError'
    }
}

function buildQueryString(params: ListParams): string {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue
        if (k === 'filters' && typeof v === 'object' && !Array.isArray(v)) {
            for (const [fk, fv] of Object.entries(v as Record<string, unknown>)) {
                if (fv !== undefined && fv !== null) qs.append(fk, String(fv))
            }
        } else if (Array.isArray(v)) {
            v.forEach((val) => qs.append(k, String(val)))
        } else {
            qs.append(k, String(v))
        }
    }
    const s = qs.toString()
    return s ? `?${s}` : ''
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new ApiError(res.status, `${init?.method ?? 'GET'} ${url} → ${res.status}`)
    return res.json() as Promise<T>
}

export const api = {
    getList: <T>(path: string, params: ListParams = {}) =>
        request<Paginated<T>>(`/api/${path}${buildQueryString(params)}`),
    getOne: <T>(path: string, id: string) =>
        request<Single<T>>(`/api/${path}/${id}`),
    post: <T, B>(path: string, body: B) =>
        request<Single<T>>(`/api/${path}`, { method: 'POST', body: JSON.stringify(body) }),
    put: <T, B>(path: string, body: B) =>
        request<Single<T>>(`/api/${path}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: async (path: string) => {
        const res = await fetch(`/api/${path}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new ApiError(res.status, `DELETE /api/${path} → ${res.status}`)
        if (res.status === 204 || res.headers.get('content-length') === '0') return
        return res.json() as Promise<{ data: unknown }>
    },
}
