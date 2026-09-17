import axios from 'axios'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
    return value && typeof value === 'object' ? value as UnknownRecord : null
}

function responseOf(error: unknown): UnknownRecord | null {
    return asRecord(asRecord(error)?.response)
}

export function getApiStatus(error: unknown): number | undefined {
    const status = responseOf(error)?.status
    return typeof status === 'number' ? status : undefined
}

export function getApiErrorCode(error: unknown): string | undefined {
    const data = asRecord(responseOf(error)?.data)
    const apiError = asRecord(data?.error)
    return typeof apiError?.code === 'string' ? apiError.code : undefined
}

export function getApiMessage(error: unknown): string | undefined {
    const data = asRecord(responseOf(error)?.data)
    return typeof data?.message === 'string' ? data.message : undefined
}

export function hasApiResponse(error: unknown): boolean {
    return responseOf(error) !== null
}

export function isApiNetworkError(error: unknown): boolean {
    return axios.isAxiosError(error) && !error.response
}
