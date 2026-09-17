import { ApiError } from './fetcher'

export const uploadApi = {
    avatar: async (file: File): Promise<string> => {
        const form = new FormData()
        form.append('file', file)

        const res = await fetch('/api/upload', { method: 'POST', body: form })
        if (!res.ok) throw new ApiError(res.status, `POST /api/upload -> ${res.status}`)

        const json = await res.json()
        const url = json.data?.url ?? json.url
        if (typeof url !== 'string' || url.length === 0) {
            throw new ApiError(res.status, 'POST /api/upload -> invalid response')
        }

        return url
    },
}
