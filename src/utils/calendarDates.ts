export type CalendarMode = 'month' | 'week'

export function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

export function startOfWeek(d: Date): Date {
    const s = startOfDay(d)
    const day = s.getDay()
    const offset = day === 0 ? -6 : 1 - day
    return new Date(s.getFullYear(), s.getMonth(), s.getDate() + offset)
}

export function addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function addMonths(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
}

export function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseIso(s: string): Date {
    return new Date(s)
}

export function buildMonthGrid(cursor: Date): Date[] {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const gridStart = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export function buildWeekGrid(cursor: Date): Date[] {
    const s = startOfWeek(cursor)
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

export function formatCalendarHeader(cursor: Date, mode: CalendarMode): string {
    if (mode === 'month') {
        return cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    const s = startOfWeek(cursor)
    const e = addDays(s, 6)
    if (s.getMonth() === e.getMonth()) {
        return `${s.toLocaleDateString('en-US', { month: 'short' })} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}
