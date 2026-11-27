export const DEMO_BAR_KEY = 'mg:demo-bar'
const MAX_IDS = 40
const MAX_ID_LENGTH = 64

const listeners = new Set<() => void>()

export function subscribeDemoBar(listener: () => void): () => void {
    listeners.add(listener)
    window.addEventListener('storage', listener)
    return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', listener)
    }
}

function notify() {
    listeners.forEach(listener => listener())
}

export function readDemoBarRaw(): string {
    try {
        return globalThis.localStorage.getItem(DEMO_BAR_KEY) ?? ''
    } catch {
        return ''
    }
}

export function parseDemoBar(raw: string): string[] {
    try {
        const parsed: unknown = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed
            .filter((v): v is string => typeof v === 'string' && v.length >= 1 && v.length <= MAX_ID_LENGTH)
            .slice(0, MAX_IDS)
    } catch {
        return []
    }
}

export function readDemoBar(): string[] {
    return parseDemoBar(readDemoBarRaw())
}

export function writeDemoBar(ids: string[]): void {
    try {
        globalThis.localStorage.setItem(DEMO_BAR_KEY, JSON.stringify(ids.slice(0, MAX_IDS)))
    } catch {
        return
    }
    notify()
}

export function persistDisplayedBar(ids: string[]): void {
    if (ids.length === 0) return
    const stored = readDemoBar()
    if (stored.length === ids.length && stored.every(id => ids.includes(id))) return
    writeDemoBar(ids)
}

export function clearDemoBar(): void {
    try {
        globalThis.localStorage.removeItem(DEMO_BAR_KEY)
    } catch {
        return
    }
    notify()
}
