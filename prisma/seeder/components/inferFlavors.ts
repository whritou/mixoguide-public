import {Flavor} from "./types";

function normalizeToken(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        // Remove Unicode combining diacritical marks (portable across targets)
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

const FLAVOR_KEYWORDS: Record<Flavor, string[]> = {
    sweet: ['syrup', 'sugar', 'grenadine', 'honey', 'agave', 'maple', 'liqueur', 'baileys', 'amaretto', 'demerara', 'simple syrup', 'caramel'],
    sour: ['lemon', 'lime', 'lime juice', 'lemon juice', 'grapefruit', 'sour mix', 'tamarind'],
    bitter: ['bitters', 'campari', 'angostura', 'amaro', 'fernet', 'cynar', 'grapefruit peel'],
    spicy: ['ginger', 'pepper', 'jalapeno', 'jalape', 'tabasco', 'hot sauce', 'chili', 'chipotle', 'habanero'],
    savory: ['tomato', 'worcestershire', 'tabasco', 'olive', 'celery', 'soy', 'soy sauce', 'miso', 'anchovy'],
    fruity: ['fruit', 'pineapple', 'mango', 'banana', 'berry', 'strawberry', 'raspberry', 'blueberry', 'peach', 'apricot', 'apple', 'pear', 'cranberry', 'pomegranate'],
    herbal: ['basil', 'rosemary', 'thyme', 'mint', 'peppermint', 'chartreuse', 'benedictine', 'absinthe', 'st-germain', 'elderflower', 'cilantro'],
    smoky: ['mezcal', 'scotch', 'peat', 'smoke', 'smoked', 'islay'],
    floral: ['lavender', 'rose', 'elderflower', 'violet', 'hibiscus', 'orange blossom'],
    refreshing: ['soda', 'tonic', 'club soda', 'sparkling', 'ginger ale', 'sprite', 'seltzer', 'refreshing', 'cola', 'cucumber'],
    creamy: ['cream', 'milk', 'eggw', 'baileys', 'cream liqueur', 'coconut cream', 'coconut milk', 'yogurt', 'condensed milk'],
    citrus: ['orange', 'lemon', 'lime', 'grapefruit', 'citrus', 'orange juice', 'lime juice', 'lemon juice'],
    nutty: ['almond', 'amaretto', 'orgeat', 'frangelico', 'hazelnut', 'nut', 'peanut'],
    earthy: ['mushroom', 'beet', 'root', 'earthy', 'roasted', 'oak', 'barrel', 'smoked oak'],
    bubbly: ['champagne', 'prosecco', 'sparkling', 'cava', 'bubbly'],
    tropical: ['pineapple', 'coconut', 'passion', 'mango', 'papaya', 'guava', 'banana', 'rum'],
    dry: ['dry vermouth', 'dry wine', 'dry'],
    rich: ['dark rum', 'demerara', 'brown sugar', 'molasses', 'toffee'],
    strong: ['vodka', 'gin', 'rum', 'whiskey', 'bourbon', 'tequila', 'brandy', 'cognac', 'mezcal', 'spirit'],
    warm: ['cinnamon', 'clove', 'nutmeg', 'hot water', 'mulled', 'tea', 'chai'],
    coffee: ['coffee', 'espresso', 'kahlua', 'tiramisu', 'cold brew'],
    light: ['soda', 'tonic', 'light', 'diet', 'zero', 'low-calorie']
}

// Add missing FLAVOR_SYNONYMS for normalization
const FLAVOR_SYNONYMS: Record<string, string> = {
    // common misspellings / alternative names normalized to canonical tokens
    'granadine': 'grenadine',
    'grenadine syrup': 'grenadine',
    'kahlua': 'kahlua',
    'kah lua': 'kahlua',
    'jalape': 'jalapeño',
    'pina': 'piña',
    'pina colada': 'piña colada',
    'creme': 'crème',
}

function tokenMatchesKeyword(token: string, keyword: string): boolean {
    return token === keyword || token.includes(keyword) || keyword.includes(token)
}

export function inferFlavors(ingredientNames: string[], isAlcoholic: boolean): Flavor[] {
    const tokens: string[] = []
    for (const raw of ingredientNames) {
        if (!raw) continue
        const normalized = normalizeToken(FLAVOR_SYNONYMS[raw.toLowerCase()] ?? raw)
        tokens.push(...normalized.split(' ').filter(Boolean))
    }

    // Build scores (start from small epsilon to make sorting deterministic)
    const scores: Record<Flavor, number> = Object.keys(FLAVOR_KEYWORDS).reduce((acc, f) => { acc[f as Flavor] = 0.001; return acc }, {} as Record<Flavor, number>)

    for (const token of tokens) {
        for (const [flavor, keywords] of Object.entries(FLAVOR_KEYWORDS) as [Flavor, string[]][]) {
            for (const kw of keywords) {
                const kwNorm = normalizeToken(kw)
                if (tokenMatchesKeyword(token, kwNorm)) {
                    // Longer/multi-word keywords are stronger
                    let weight = kwNorm.split(' ').length > 1 ? 1.5 : 1
                    // exact token match gets a small bonus
                    if (token === kwNorm) weight += 0.5
                    scores[flavor] += weight
                }
            }
        }
    }

    // Heuristics / boosts
    const nameStr = ingredientNames.join(' ').toLowerCase()
    if (/syrup|liqueur|grenadine|simple syrup|honey|agave|maple/.test(nameStr)) scores['sweet'] += 2
    if (/lime|lemon|orange|grapefruit/.test(nameStr)) scores['citrus'] += 1
    if (isAlcoholic) {
        const spiritCount = (nameStr.match(/vodka|gin|rum|whiskey|whisky|bourbon|tequila|brandy|cognac|mezcal|spirit/g) || []).length
        if (spiritCount >= 1 && ingredientNames.length <= 4) scores['strong'] += 2
    } else {
        scores['refreshing'] += 2
        scores['light'] += 1
    }

    // Normalize by number of tokens to reduce bias for long ingredient lists
    const tokenCount = Math.max(1, tokens.length)
    for (const k of Object.keys(scores) as Flavor[]) scores[k] = +(scores[k] / tokenCount).toFixed(3)

    // Convert to sorted list and take top flavors (filter tiny values)
    const sorted = Object.entries(scores)
        .filter(([, v]) => v > 0.01)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k as Flavor)

    if (sorted.length === 0) {
        if (!isAlcoholic) return ['refreshing', 'light']
        return ['sweet']
    }

    return sorted.slice(0, 5)
}
