import { NextRequest } from 'next/server'
import { createRequest } from 'node-mocks-http'

export const TEST_ORIGIN = 'http://localhost:3000'

export type TestSession = {
    user: {
        id: string
        email: string
        name: string
        role: 'USER' | 'ADMIN'
        image?: string | null
    }
}

export function makeSession(overrides: Partial<TestSession['user']> = {}): TestSession {
    return {
        user: {
            id:    'user-1',
            email: 'user@example.com',
            name:  'Test User',
            role:  'USER',
            image: null,
            ...overrides,
        },
    }
}

export function makeAdminSession(overrides: Partial<TestSession['user']> = {}): TestSession {
    return makeSession({ id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'ADMIN', ...overrides })
}

export function csrfHeaders(origin = TEST_ORIGIN) {
    return {
        host: 'localhost:3000',
        origin,
        referer: `${origin}/`,
    }
}

export function routeContext(params: Record<string, string> = {}) {
    return { params: Promise.resolve(params) }
}

export function nextRequest({
    method = 'GET',
    path = '/api/test',
    body,
    headers = {},
}: {
    method?: string
    path?: string
    body?: unknown
    headers?: Record<string, string>
} = {}) {
    const url = path.startsWith('http') ? path : `${TEST_ORIGIN}${path}`
    const nodeReq = createRequest({
        method,
        url,
        headers: { host: 'localhost:3000', ...headers },
        body,
    } as Parameters<typeof createRequest>[0])
    const requestHeaders = new Headers()

    for (const [key, value] of Object.entries(nodeReq.headers)) {
        if (Array.isArray(value)) requestHeaders.set(key, value.join(','))
        else if (value !== undefined) requestHeaders.set(key, String(value))
    }

    const hasBody = body !== undefined && method !== 'GET' && method !== 'HEAD'
    if (hasBody && !requestHeaders.has('content-type')) requestHeaders.set('content-type', 'application/json')

    return new NextRequest(url, {
        method,
        headers: requestHeaders,
        body: hasBody ? JSON.stringify(body) : undefined,
    })
}

export async function jsonBody<T = unknown>(response: Response): Promise<T> {
    return response.json() as Promise<T>
}
