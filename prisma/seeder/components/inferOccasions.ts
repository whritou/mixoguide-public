import {Flavor, Occasion} from "./types";

export function inferOccasions(ingredientNames: string[], flavors: Flavor[], isAlcoholic: boolean): Occasion[] {
    const scores: Record<Occasion, number> = {} as Record<Occasion, number>

    // Initialize explicit keys (avoid TS verbosity)
    const initKeys: Occasion[] = ['party','romantic','casual','formal','holiday','summer','winter','spring','fall','celebration','everyday','brunch','happy_hour','after_dinner','dinner','before_dinner','cocktail_hour','picnic','barbecue','beach','pool_party','game_night','movie_night','date_night','family_gathering','friends_gathering','wedding','birthday','anniversary','graduation','baby_shower','bridal_shower','housewarming','new_years_eve','valentines_day','halloween','thanksgiving','digestif','aperitif','date','mocktail_friendly','after_work','luxury','retro']
    for (const k of initKeys) scores[k] = 0

    const flSet = new Set(flavors)
    const nameStr = ingredientNames.join(' ').toLowerCase()

    // Flavor-driven mapping (weights)
    const flavorToOccasions: Partial<Record<Flavor, Partial<Record<Occasion, number>>>> = {
        tropical: { summer: 2, beach: 2, party: 1 },
        bubbly: { celebration: 2, brunch: 1 },
        creamy: { after_dinner: 1 },
        coffee: { after_dinner: 1, casual: 1 },
        refreshing: { casual: 1, summer: 1, happy_hour: 1, picnic: 1 },
        strong: { formal: 1, after_dinner: 1 },
        smoky: { after_dinner: 1, formal: 1 },
        spicy: { party: 1, friends_gathering: 1 },
        warm: { winter: 2, holiday: 1 },
        fruity: { casual: 1, summer: 1, brunch: 1 },
        floral: { cocktail_hour: 1, date_night: 1 },
        herbal: { cocktail_hour: 1, brunch: 1 },
        citrus: { brunch: 2, summer: 1, happy_hour: 1 },
        sweet: { party: 1 },
        nutty: { after_dinner: 1 },
        dry: { formal: 1, before_dinner: 1 },
        light: { everyday: 1, mocktail_friendly: 1 },
        earthy: { formal: 1, dinner: 1 },
        rich: { after_dinner: 1 },
        savory: { dinner: 1, barbecue: 1 },
        bitter: { aperitif: 1 },
    }

    for (const f of Array.from(flSet)) {
        const map = flavorToOccasions[f]
        if (!map) continue
        for (const [oc, w] of Object.entries(map)) {
            if (oc in scores) scores[oc as Occasion] += w as number
        }
    }

    // Ingredient-driven rules
    if (/champagne|prosecco|sparkling/.test(nameStr)) scores['celebration'] += 2
    if (/espresso|coffee|kahlua|cold brew/.test(nameStr)) scores['after_dinner'] += 1
    if (/rum.*coconut|piña|pina|pineapple|tropical/.test(nameStr)) { scores['beach'] += 1; scores['summer'] += 1 }
    if (/chocolate|cocoa|espresso/.test(nameStr)) scores['after_dinner'] += 1
    if (!isAlcoholic) { scores['mocktail_friendly'] += 2; scores['everyday'] += 1 }
    if (/champagne|mimosa|brunch/.test(nameStr)) scores['brunch'] += 1
    if (/mint|basil|herb/.test(nameStr)) scores['brunch'] += 0.5

    // Occasion-specific hints
    if (/valentine|romance|rosé/.test(nameStr)) scores['romantic'] += 2
    if (/halloween|pumpkin|spice/.test(nameStr)) scores['halloween'] += 2

    // Default fallback
    if (Object.values(scores).every(v => v === 0)) {
        if (isAlcoholic) { scores['casual'] = 1; scores['happy_hour'] = 1 }
        else { scores['everyday'] = 1 }
    }

    // Convert scores to sorted list
    const sorted = Object.entries(scores)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k as Occasion)

    return sorted.slice(0, 5)
}
