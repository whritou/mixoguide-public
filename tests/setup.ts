import { afterEach, vi } from 'vitest'
import { resetFactoryCounter } from './factories'

afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    resetFactoryCounter()
})
