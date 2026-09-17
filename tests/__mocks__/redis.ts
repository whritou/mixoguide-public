import { vi } from 'vitest'

export function createRedisMock() {
    return {
        connect: vi.fn(),
        del:     vi.fn(),
        expire:  vi.fn(),
        get:     vi.fn(),
        incr:    vi.fn(),
        on:      vi.fn(),
        set:     vi.fn(),
        ttl:     vi.fn(),
    }
}

export const redisMock = createRedisMock()
export const getRedisMock = vi.fn(async () => null as typeof redisMock | null)
