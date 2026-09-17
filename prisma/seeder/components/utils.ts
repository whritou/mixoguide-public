import {MeasureUnit, ParsedMeasure} from "./types";

export function normalizeName(name: string): string {
    return name ? name.toLowerCase().trim().replace(/\s+/g, ' ') : ''
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function parseFraction(str: string): number {
    const parts = str.split('/')
    if (parts.length === 2) {
        const num = parseFloat(parts[0])
        const den = parseFloat(parts[1])
        if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den
    }
    return NaN
}

export function parseMeasure(measureStr: string | null): ParsedMeasure {
    if (!measureStr || !measureStr.trim()) return { amount: null, unit: 'oz' }
    const s = measureStr.trim().toLowerCase()
    if (/to taste|as needed|optional|garnish/i.test(s)) return { amount: null, unit: 'pcs' }
    let unit: MeasureUnit = 'oz'
    if (/\bcl\b/.test(s)) unit = 'cl'
    else if (/\bml\b/.test(s)) unit = 'ml'
    else if (/\boz\b/.test(s)) unit = 'oz'
    else if (/\bg\b/.test(s)) unit = 'g'
    else if (/\bslice/.test(s)) unit = 'slice'
    else if (/\btwist/.test(s)) unit = 'twist'
    else if (/\bzest/.test(s)) unit = 'zest'
    else if (/\bpcs|\bpiece|\bwhole|\bwedge/.test(s)) unit = 'pcs'

    let amount: number | null = null
    const mixedMatch = s.match(/(\d+)\s+(\d+\/\d+)/)
    const fractionMatch = s.match(/(\d+\/\d+)/)
    const decimalMatch = s.match(/(\d+\.?\d*)/)
    if (mixedMatch) amount = parseInt(mixedMatch[1]) + parseFraction(mixedMatch[2])
    else if (fractionMatch) amount = parseFraction(fractionMatch[1])
    else if (decimalMatch) amount = parseFloat(decimalMatch[1])

    if (amount !== null) {
        if (/\bdash/.test(s)) amount = amount * 0.1
        else if (/\btsp|teaspoon/.test(s)) amount = amount * 0.5
        else if (/\btbsp|tablespoon/.test(s)) amount = amount * 1.5
        else if (/\bshot|\bjigger/.test(s)) amount = amount * 1.5
    }

    if (/juice of/i.test(s) && amount !== null && unit === 'oz') unit = 'pcs'
    return { amount, unit }
}

export function splitInstructions(text: string | null): string[] {
    if (!text || !text.trim()) return ['Prepare the drink.']
    let steps = text
        .split(/\.\s+|\n+|(?=\d+\.\s)|(?=step\s+\d+)/i)
        .map(s => s.replace(/^\d+\.\s*/, '').replace(/^step\s+\d+[:.]\s*/i, '').trim())
        .filter(s => s.length > 5)
    if (steps.length === 0) steps = [text.trim()]
    return steps
}