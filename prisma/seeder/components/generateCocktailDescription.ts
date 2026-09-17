import {Difficulty, Flavor, Occasion, ResolvedIngredient, Technique} from "./types";

interface CocktailDescriptionInput {
    name: string
    glassName: string | null
    techniques: Technique[]
    flavors: Flavor[]
    occasions: Occasion[]
    ingredients: ResolvedIngredient[]
    isAlcoholic: boolean
    difficulty: Difficulty
}

/**
 * Generates a natural, readable description for a cocktail based on all its
 * inferred metadata. Produces 2–3 sentences covering character, preparation,
 * and ideal moment without restating the name in every sentence.
 */
export function generateCocktailDescription(input: CocktailDescriptionInput): string {
    const { name, glassName, techniques, flavors, occasions, ingredients, isAlcoholic, difficulty } = input

    // ── 1. Build flavor profile sentence ─────────────────────────────────────
    const primaryFlavors: Flavor[] = ['smoky', 'bitter', 'sour', 'spicy', 'creamy', 'tropical', 'citrus', 'herbal', 'floral', 'sweet', 'coffee', 'nutty', 'fruity', 'bubbly', 'warm', 'refreshing']
    const ranked = primaryFlavors.filter(f => flavors.includes(f))
    const topFlavors = ranked.slice(0, 3)

    let flavorDesc: string
    if (topFlavors.length === 0) {
        flavorDesc = 'well-balanced'
    } else if (topFlavors.length === 1) {
        flavorDesc = topFlavors[0]
    } else if (topFlavors.length === 2) {
        flavorDesc = `${topFlavors[0]} and ${topFlavors[1]}`
    } else {
        flavorDesc = `${topFlavors[0]}, ${topFlavors[1]}, and ${topFlavors[2]}`
    }

    // ── 2. Spirit / base ingredient ──────────────────────────────────────────
    const alcoholicIngredients = ingredients.filter(i => i.isAlcoholic)
    const mainSpirit = alcoholicIngredients[0]?.name ?? null

    const spiritPhrase = mainSpirit
        ? `built on a base of ${mainSpirit.toLowerCase()}`
        : isAlcoholic
            ? 'spirit-forward'
            : 'alcohol-free'

    // ── 3. Opening sentence ───────────────────────────────────────────────────
    const openings = [
        `${name} is a ${flavorDesc} cocktail ${spiritPhrase}.`,
        `A ${flavorDesc} drink ${spiritPhrase}, ${name} is a crowd-pleasing classic.`,
        `${name} is a ${flavorDesc}, ${spiritPhrase} cocktail that delivers character in every sip.`,
    ]
    // Pick deterministically based on name length to avoid randomness in seeder
    const opening = openings[name.length % openings.length]

    // ── 4. Preparation sentence ───────────────────────────────────────────────
    const techniqueLabels: Record<Technique, string> = {
        shaken:    'shaken with ice',
        stirred:   'stirred until perfectly chilled',
        built:     'built directly in the glass',
        layered:   'carefully layered for a striking visual effect',
        blended:   'blended smooth',
        flamed:    'finished with a dramatic flame',
        infused:   'infused for depth of flavour',
        clarified: 'clarified for exceptional clarity',
        muddled:   'muddled to release fresh aromatics',
        smoked:    'smoked for an intense finish',
    }

    const glassPhrase = glassName ? ` and served in a ${glassName.toLowerCase()}` : ''
    const tech = techniques[0]
    const prepSentence = tech
        ? `It is ${techniqueLabels[tech]}${glassPhrase}.`
        : glassName
            ? `It is served in a ${glassName.toLowerCase()}.`
            : ''

    // ── 5. Occasion / context sentence ────────────────────────────────────────
    const occasionPhraseMap: Partial<Record<Occasion, string>> = {
        summer:          'perfect for warm summer days',
        winter:          'ideal for cosy winter evenings',
        party:           'a great choice for lively gatherings',
        romantic:        'an elegant option for romantic occasions',
        brunch:          'a delightful brunch companion',
        after_dinner:    'a satisfying after-dinner treat',
        before_dinner:   'an excellent aperitif',
        aperitif:        'a refined aperitif',
        digestif:        'a smooth digestif',
        celebration:     'made for celebratory moments',
        date_night:      'ideal for a special date night',
        casual:          'a relaxed, everyday favourite',
        happy_hour:      'the go-to for happy hour',
        beach:           'tailor-made for beach days',
        luxury:          'a sophisticated, luxurious choice',
        holiday:         'a festive treat for the holidays',
        new_years_eve:   'a sparkling choice for New Year\'s Eve',
        halloween:       'a spooky Halloween favourite',
        retro:           'a beloved retro classic',
        mocktail_friendly: 'easily adapted as a mocktail',
    }

    const occasionPriority: Occasion[] = [
        'romantic', 'luxury', 'celebration', 'date_night', 'after_dinner',
        'aperitif', 'digestif', 'before_dinner', 'brunch', 'summer', 'winter',
        'beach', 'holiday', 'new_years_eve', 'halloween', 'party', 'happy_hour',
        'casual', 'retro', 'mocktail_friendly',
    ]
    const matchedOccasion = occasionPriority.find(o => occasions.includes(o))
    const occasionPhrase = matchedOccasion ? occasionPhraseMap[matchedOccasion] : null

    const difficultyPhrase: Record<Difficulty, string> = {
        easy:   'quick and simple to make',
        medium: 'straightforward to prepare',
        hard:   'rewarding for the skilled bartender',
    }

    let closingSentence: string
    if (occasionPhrase && difficulty !== 'easy') {
        closingSentence = `It is ${occasionPhrase} and ${difficultyPhrase[difficulty]}.`
    } else if (occasionPhrase) {
        closingSentence = `It is ${occasionPhrase}.`
    } else {
        closingSentence = `It is ${difficultyPhrase[difficulty]}.`
    }

    // ── 6. Assemble ───────────────────────────────────────────────────────────
    return [opening, prepSentence, closingSentence]
        .filter(Boolean)
        .join(' ')
}
