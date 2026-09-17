import { describe, expect, it } from 'vitest'
import {
    canonicalizeIngredientName,
    getIngredientCanonicalPairs,
    normalizeIngredientKey,
} from '../../../prisma/seeder/components/ingredientCanonicalization'

describe('ingredient canonicalization', () => {
    it('maps the reported duplicate names to canonical ingredients', () => {
        expect(canonicalizeIngredientName('Baileys irish cream')).toBe('Irish cream')
        expect(canonicalizeIngredientName('Absolut Vodka')).toBe('Vodka')
        expect(canonicalizeIngredientName('Jack Daniels')).toBe('Tennessee whiskey')
        expect(canonicalizeIngredientName('Whisky')).toBe('Whiskey')
        expect(canonicalizeIngredientName('Pepper')).toBe('Black pepper')
        expect(canonicalizeIngredientName('Powdered sugar')).toBe('Sugar')
        expect(canonicalizeIngredientName('Soda Water')).toBe('Club soda')
        expect(canonicalizeIngredientName('Vermouth')).toBe('Dry Vermouth')
        expect(canonicalizeIngredientName('Rosso Vermouth')).toBe('Sweet Vermouth')
        expect(canonicalizeIngredientName('Kahlua')).toBe('Coffee liqueur')
        expect(canonicalizeIngredientName('Kahlúa')).toBe('Coffee liqueur')
    })

    it('keeps meaningful whiskey styles separate', () => {
        expect(canonicalizeIngredientName('Rye Whiskey')).toBe('Rye Whiskey')
        expect(canonicalizeIngredientName('Irish whiskey')).toBe('Irish whiskey')
        expect(canonicalizeIngredientName('Scotch')).toBe('Scotch')
    })

    it('normalizes punctuation and accents for alias lookup', () => {
        expect(canonicalizeIngredientName("Bailey's Irish Cream")).toBe('Irish cream')
        expect(canonicalizeIngredientName('Jägermeister')).toBe('Jagermeister')
        expect(normalizeIngredientKey('Club-soda')).toBe(normalizeIngredientKey('club soda'))
    })

    it('exposes only actionable alias pairs', () => {
        const pairs = getIngredientCanonicalPairs()
        expect(pairs).toContainEqual({ alias: 'Whisky', canonical: 'Whiskey' })
        expect(pairs).not.toContainEqual({ alias: 'Jagermeister', canonical: 'Jagermeister' })
    })
})
