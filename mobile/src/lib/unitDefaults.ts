export function defaultQuantityForUnit(unit?: string | null): number {
    switch ((unit ?? '').trim().toLowerCase()) {
        case 'cl':
            return 75
        case 'ml':
            return 750
        case 'oz':
            return 25
        case 'g':
        case 'gram':
        case 'grams':
            return 100
        case 'pcs':
        case 'piece':
        case 'pieces':
            return 5
        default:
            return 1
    }
}

export function defaultQuantityText(unit?: string | null): string {
    return String(defaultQuantityForUnit(unit))
}

export function isDefaultQuantityText(value: string, unit?: string | null): boolean {
    return value.trim() === defaultQuantityText(unit)
}
