const DAY_MS = 24 * 60 * 60 * 1000

export function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseIsoDate(value: string): Date {
    return new Date(value)
}

export function diffInDays(target: Date, now: Date): number {
    const targetStart = startOfLocalDay(target).getTime()
    const nowStart = startOfLocalDay(now).getTime()
    return Math.round((targetStart - nowStart) / DAY_MS)
}

export function isOverdueDate(target: Date, now: Date): boolean {
    return diffInDays(target, now) < 0
}

export function isTodayDate(target: Date, now: Date): boolean {
    return diffInDays(target, now) === 0
}

export function formatDayName(date: Date, options?: { short?: boolean }): string {
    return date.toLocaleDateString('en-US', {
        weekday: options?.short ? 'short' : 'long',
    })
}

export function formatMonthDay(date: Date): string {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export function formatMonthDayYear(date: Date): string {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function relativeDateLabel(
    target: Date,
    now: Date,
    options?: { includeMonthDayPrefix?: boolean; eventStyle?: boolean },
): string {
    const diff = diffInDays(target, now)
    const monthDay = formatMonthDay(target).toUpperCase()
    const prefix = options?.includeMonthDayPrefix ? `${monthDay}  -  ` : ''

    if (options?.eventStyle) {
        if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`
        if (diff === 0) return 'Today'
        if (diff === 1) return 'Tomorrow'
        return `In ${diff} days`
    }

    if (diff < 0) return `${prefix}OVERDUE`
    if (diff === 0) return `${prefix}TONIGHT`
    if (diff === 1) return `${prefix}TOMORROW`
    return prefix.trim() || monthDay
}
