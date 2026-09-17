import { describe, expect, it } from 'vitest'
import {
    COCKTAIL_TECHNIQUES,
    calculateCocktailComplexity,
    inferTechniquesFromInstructions,
} from '../../../prisma/seeder/components/cocktailComplexity'

describe('cocktail complexity scoring', () => {
    it('keeps simple high-ingredient built drinks out of hard difficulty', () => {
        const complexity = calculateCocktailComplexity({
            ingredientCount: 8,
            instructions: [
                'Pour all ingredients into a highball glass with ice.',
                'Stir gently and serve.',
            ],
            techniques: ['built'],
            barTools: ['Jigger'],
        })

        expect(complexity.difficulty).toBe('medium')
        expect(complexity.preparationTime).toBeLessThanOrEqual(10)
    })

    it.each([
        { technique: 'smoked' as const, tool: 'Smoking Gun', instruction: 'Smoke the serving glass with wood chips.' },
        { technique: 'flamed' as const, tool: 'Torch', instruction: 'Flame an orange peel over the drink.' },
        { technique: 'clarified' as const, tool: 'Clarifier', instruction: 'Clarify the punch with milk.' },
    ])('scores $technique above simple shaken or stirred drinks with more ingredients', ({ technique, tool, instruction }) => {
        const simpleShaken = calculateCocktailComplexity({
            ingredientCount: 10,
            instructions: [
                'Add all ingredients to a shaker with ice.',
                'Shake and strain into a chilled glass.',
            ],
            techniques: ['shaken'],
            barTools: ['Shaker', 'Strainer'],
        })
        const advanced = calculateCocktailComplexity({
            ingredientCount: 4,
            instructions: [
                instruction,
                'Stir the drink with ice and strain into the smoked glass.',
            ],
            techniques: [technique, 'stirred'],
            barTools: [tool, 'Bar Spoon'],
        })

        expect(simpleShaken.difficulty).toBe('medium')
        expect(advanced.difficulty).toBe('hard')
        expect(advanced.score).toBeGreaterThan(simpleShaken.score)
    })

    it('uses step count as a real complexity signal', () => {
        const complexity = calculateCocktailComplexity({
            ingredientCount: 4,
            instructions: [
                'Chill the glass.',
                'Measure the spirits.',
                'Add bitters.',
                'Stir with ice.',
                'Taste for dilution.',
                'Strain into the glass.',
                'Express the peel.',
                'Garnish and serve.',
            ],
            techniques: ['stirred'],
            barTools: ['Bar Spoon', 'Mixing Glass', 'Strainer'],
        })

        expect(complexity.difficulty).toBe('medium')
        expect(complexity.preparationTime).toBeGreaterThan(10)
    })

    it('keeps prep time focused on active work instead of passive waits', () => {
        const complexity = calculateCocktailComplexity({
            ingredientCount: 4,
            instructions: [
                'Infuse the spirit with fruit for 24 hours.',
                'Strain the infused spirit into a mixing glass and stir with ice.',
            ],
            techniques: ['infused', 'stirred'],
            barTools: ['Infuser', 'Bar Spoon'],
        })

        expect(complexity.difficulty).toBe('hard')
        expect(complexity.preparationTime).toBeLessThanOrEqual(15)
    })

    it('infers every supported cocktail technique from instructions', () => {
        const text = [
            'Shake the citrus ingredients with ice.',
            'Stir the spirit base until chilled.',
            'Build the drink directly in the glass.',
            'Layer the cream over the back of a spoon.',
            'Blend with crushed ice.',
            'Flame an orange peel over the drink.',
            'Infuse the syrup overnight.',
            'Clarify the punch with milk.',
            'Muddle mint leaves gently.',
            'Smoke the glass before serving.',
        ].join(' ')

        expect(inferTechniquesFromInstructions(text).sort()).toEqual([...COCKTAIL_TECHNIQUES].sort())
    })
})
