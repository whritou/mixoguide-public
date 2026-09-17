import type { MakeableCocktail, MakeableStatus } from '../types/cocktail'

type MakeableStatusInput = Pick<MakeableCocktail, 'makeableStatus' | 'missingCount' | 'requiredCount'>

export function isMakeableStatus(status?: MakeableStatus | null): boolean {
    return status === 'full' || status === 'withDerivates' || status === 'withSubstitutes'
}

export function isMakeableCocktailNow(makeable?: Pick<MakeableCocktail, 'makeableStatus'> | null): boolean {
    return isMakeableStatus(makeable?.makeableStatus)
}

export function makeableStatusShortLabel(makeable?: MakeableStatusInput | null): string | null {
    if (!makeable) return null
    if (makeable.makeableStatus === 'full') return 'Makeable'
    if (makeable.makeableStatus === 'withDerivates') return 'Makeable'
    if (makeable.makeableStatus === 'withSubstitutes') return 'Makeable'
    if (makeable.makeableStatus === 'missing') {
        return `${makeable.requiredCount - makeable.missingCount}/${makeable.requiredCount}`
    }
    return null
}
