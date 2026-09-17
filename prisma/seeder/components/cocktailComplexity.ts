import type { Difficulty, Technique } from './types'

export const COCKTAIL_TECHNIQUES: Technique[] = [
    'shaken',
    'stirred',
    'built',
    'layered',
    'blended',
    'flamed',
    'infused',
    'clarified',
    'muddled',
    'smoked',
]

type TechniquePattern = {
    pattern: RegExp
    technique: Technique
}

const TECHNIQUE_PATTERNS: TechniquePattern[] = [
    { pattern: /\bshak(?:e|es|ing|en)\b/i, technique: 'shaken' },
    { pattern: /\bstir(?:s|ring|red)?\b/i, technique: 'stirred' },
    { pattern: /\bblend(?:s|ing|ed)?\b/i, technique: 'blended' },
    { pattern: /\blayer(?:s|ing|ed)?\b|\bfloat(?:s|ing|ed)?\b/i, technique: 'layered' },
    { pattern: /\bmuddle(?:s|d|ing)?\b/i, technique: 'muddled' },
    { pattern: /\bflam(?:e|es|ed|ing|be)\b|\bignite(?:s|d|ing)?\b|\btorch(?:es|ed|ing)?\b/i, technique: 'flamed' },
    { pattern: /\binfus(?:e|es|ed|ing|ion)\b|\bsteep(?:s|ed|ing)?\b|\bfat[-\s]?wash(?:es|ed|ing)?\b/i, technique: 'infused' },
    { pattern: /\bclarif(?:y|ies|ied|ying|ication)\b|\bmilk[-\s]?wash(?:es|ed|ing)?\b/i, technique: 'clarified' },
    { pattern: /\bsmok(?:e|es|ed|ing)\b|\bsmoke[-\s]?infus(?:e|ed|ing|ion)\b/i, technique: 'smoked' },
    { pattern: /\bbuild(?:s|ing)?\b|\bbuilt\b|\bpour\b[^.?!]*(?:directly\s+)?into\s+(?:a\s+|the\s+)?(?:serving\s+)?glass\b/i, technique: 'built' },
]

const TECHNIQUE_DIFFICULTY_SCORE: Record<Technique, number> = {
    built: 0,
    stirred: 0.5,
    shaken: 0.5,
    blended: 1,
    muddled: 1,
    layered: 2,
    flamed: 3.5,
    smoked: 3.5,
    infused: 3.5,
    clarified: 4,
}

const TECHNIQUE_ACTIVE_MINUTES: Record<Technique, number> = {
    built: 0,
    stirred: 1,
    shaken: 2,
    blended: 2,
    muddled: 2,
    layered: 4,
    flamed: 4,
    smoked: 4,
    infused: 3,
    clarified: 5,
}

const BAR_TOOL_DIFFICULTY_SCORE: Record<string, number> = {
    'jigger': 0.25,
    'bar spoon': 0.2,
    'shaker': 0.25,
    'strainer': 0.25,
    'mixing glass': 0.25,
    'fine strainer': 0.4,
    'blender': 0.5,
    'muddler': 0.5,
    'lewis bag': 0.75,
    'torch': 1.25,
    'lighter': 1.25,
    'smoking gun': 1.25,
    'infuser': 1.25,
    'clarifier': 1.5,
}

const ADVANCED_BAR_TOOLS = new Set(['torch', 'lighter', 'smoking gun', 'infuser', 'clarifier'])

export interface CocktailComplexityInput {
    ingredientCount: number
    instructions: string[]
    techniques?: Technique[]
    barTools?: string[]
}

export interface CocktailComplexityResult {
    difficulty: Difficulty
    preparationTime: number
    score: number
}

export function inferTechniquesFromInstructions(text: string | null): Technique[] {
    if (!text) return []

    const found = new Set<Technique>()
    for (const { pattern, technique } of TECHNIQUE_PATTERNS) {
        if (pattern.test(text)) found.add(technique)
    }

    return COCKTAIL_TECHNIQUES.filter((technique) => found.has(technique))
}

export function calculateCocktailComplexity(input: CocktailComplexityInput): CocktailComplexityResult {
    const ingredientCount = Math.max(0, input.ingredientCount)
    const instructions = input.instructions.filter((step) => step.trim().length > 0)
    const stepCount = Math.max(1, instructions.length)
    const techniques = uniqueTechniques(input.techniques ?? [])
    const barTools = uniqueToolNames(input.barTools ?? [])

    const score = roundScore(
        techniqueDifficultyScore(techniques)
        + ingredientDifficultyScore(ingredientCount)
        + stepDifficultyScore(stepCount)
        + barToolDifficultyScore(barTools),
    )

    return {
        difficulty: score < 1.5 ? 'easy' : score < 4 ? 'medium' : 'hard',
        preparationTime: activePreparationTime({ ingredientCount, stepCount, techniques, barTools }),
        score,
    }
}

function uniqueTechniques(techniques: Technique[]): Technique[] {
    const valid = new Set<Technique>(COCKTAIL_TECHNIQUES)
    return Array.from(new Set(techniques.filter((technique) => valid.has(technique))))
}

function uniqueToolNames(barTools: string[]): string[] {
    return Array.from(new Set(barTools.map((name) => name.trim().toLowerCase()).filter(Boolean)))
}

function techniqueDifficultyScore(techniques: Technique[]): number {
    return techniques.reduce((total, technique) => total + TECHNIQUE_DIFFICULTY_SCORE[technique], 0)
}

function ingredientDifficultyScore(count: number): number {
    if (count <= 4) return 0
    if (count <= 7) return 0.75
    if (count <= 10) return 1.25
    return 1.75
}

function stepDifficultyScore(count: number): number {
    if (count <= 2) return 0
    if (count <= 4) return 0.75
    if (count <= 7) return 1.25
    return 1.75
}

function barToolDifficultyScore(barTools: string[]): number {
    const rawScore = barTools.reduce((total, tool) => total + (BAR_TOOL_DIFFICULTY_SCORE[tool] ?? 0.35), 0)
    return Math.min(rawScore, 2)
}

function activePreparationTime(input: {
    ingredientCount: number
    stepCount: number
    techniques: Technique[]
    barTools: string[]
}): number {
    const ingredientMinutes = Math.max(0, input.ingredientCount - 3) * 0.5
    const stepMinutes = Math.max(0, input.stepCount - 1)
    const techniqueMinutes = Math.min(
        12,
        input.techniques.reduce((total, technique) => total + TECHNIQUE_ACTIVE_MINUTES[technique], 0),
    )
    const toolMinutes = input.barTools.some((tool) => ADVANCED_BAR_TOOLS.has(tool)) ? 1 : 0

    return clamp(Math.ceil(3 + ingredientMinutes + stepMinutes + techniqueMinutes + toolMinutes), 3, 30)
}

function roundScore(score: number): number {
    return Math.round(score * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}
