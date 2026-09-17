import type { CocktailOccasion } from '@/types/models/cocktail'

/** Inclusive calendar window. Wraps over Dec→Jan when `from` month > `to` month. */
export interface SeasonWindow {
    from: { month: number; day: number }  // 1-indexed month, 1-indexed day
    to:   { month: number; day: number }
}

export interface SmartCollectionDefinition {
    slug:            string
    title:           string
    subtitle:        string
    /** Occasion-tag filter — matches cocktails that have at least one of these. */
    occasions:       CocktailOccasion[]
    /** Optional alcoholic filter. true = only alcoholic, false = only mocktails. */
    isAlcoholic?:    boolean
    /** Suggested servings when the user spins this up as a real collection. */
    defaultServings: number
    /** Suggested day offset from today for the plannedFor date. */
    defaultDayOffset: number
    /** Lucide / Ionicons icon hint — each platform maps it to its icon set. */
    icon:            'sparkles' | 'heart' | 'sun' | 'snowflake' | 'coffee' | 'leaf' | 'moon' | 'flame'
    /** Brand-token accent: maps to a Tailwind / RN color in the UI. */
    accent:          'caramel' | 'brown' | 'amber' | 'ink' | 'rose' | 'sage'
    /** When set, theme is hidden in `listAll` outside this calendar window. */
    season?:         SeasonWindow
}

/**
 * Curated themes that drive Smart Collections across web + mobile. The order
 * here is the order shown in the UI — evergreen themes first, then seasonal
 * ones that only appear within their `season` window.
 */
export const SMART_COLLECTIONS: SmartCollectionDefinition[] = [
  // ── Seasonal ──────────────────────────────────────────────────────────────
  {
    slug:             'spring-picks',
    title:            'Spring Picks',
    subtitle:         'Bright, floral pours for warming days.',
    occasions:        ['spring', 'brunch', 'celebration'],
    defaultServings:  4,
    defaultDayOffset: 7,
    icon:             'leaf',
    accent:           'sage',
    season:           { from: { month: 3, day: 20 }, to: { month: 5, day: 31 } },
  },
  {
    slug:             'summer-cocktails',
    title:            'Summer Cocktails',
    subtitle:         'Cold, refreshing pours for hot days.',
    occasions:        ['summer', 'pool_party', 'beach', 'barbecue', 'picnic'],
    defaultServings:  6,
    defaultDayOffset: 7,
    icon:             'sun',
    accent:           'amber',
    season:           { from: { month: 6, day: 1 }, to: { month: 9, day: 15 } },
  },
  {
    slug:             'fall-harvest',
    title:            'Fall Harvest',
    subtitle:         'Spiced, amber drinks for crisp evenings.',
    occasions:        ['fall', 'thanksgiving'],
    defaultServings:  4,
    defaultDayOffset: 7,
    icon:             'flame',
    accent:           'brown',
    season:           { from: { month: 9, day: 16 }, to: { month: 11, day: 30 } },
  },
  {
    slug:             'halloween-sips',
    title:            'Halloween Sips',
    subtitle:         'Dark, theatrical pours for the spooky season.',
    occasions:        ['halloween'],
    defaultServings:  6,
    defaultDayOffset: 7,
    icon:             'moon',
    accent:           'ink',
    season:           { from: { month: 10, day: 1 }, to: { month: 10, day: 31 } },
  },
  {
    slug:             'cozy-winter',
    title:            'Cozy Winter',
    subtitle:         'Warm, spiced drinks for chilly nights.',
    occasions:        ['winter', 'holiday', 'new_years_eve'],
    defaultServings:  4,
    defaultDayOffset: 7,
    icon:             'snowflake',
    accent:           'brown',
    season:           { from: { month: 12, day: 1 }, to: { month: 3, day: 19 } },
  },
    // ── Evergreen ─────────────────────────────────────────────────────────────
    {
        slug:             'friday-vibes',
        title:            'Friday Vibes',
        subtitle:         'Wind-down pours for the start of the weekend.',
        occasions:        ['happy_hour', 'after_work', 'friends_gathering'],
        defaultServings:  4,
        defaultDayOffset: nextWeekdayOffset(5),  // upcoming Friday
        icon:             'sparkles',
        accent:           'caramel',
    },
    {
        slug:             'date-night',
        title:            'Date Night',
        subtitle:         'Slow, elegant drinks for two.',
        occasions:        ['date_night', 'romantic'],
        defaultServings:  2,
        defaultDayOffset: nextWeekdayOffset(6),  // upcoming Saturday
        icon:             'heart',
        accent:           'rose',
    },
    {
        slug:             'brunch-club',
        title:            'Brunch Club',
        subtitle:         'Easy sippers for slow mornings.',
        occasions:        ['brunch', 'everyday'],
        defaultServings:  4,
        defaultDayOffset: nextWeekdayOffset(0),  // upcoming Sunday
        icon:             'coffee',
        accent:           'caramel',
    },
    {
        slug:             'zero-proof',
        title:            'Zero Proof',
        subtitle:         'Mocktails that hold their own.',
        occasions:        ['mocktail_friendly', 'everyday', 'brunch'],
        isAlcoholic:      false,
        defaultServings:  4,
        defaultDayOffset: 3,
        icon:             'leaf',
        accent:           'sage',
    },
    {
      slug:             'after-dinner',
      title:            'After Dinner',
      subtitle:         'Slow sippers and rich nightcaps.',
      occasions:        ['after_dinner', 'digestif'],
      defaultServings:  2,
      defaultDayOffset: 1,
      icon:             'coffee',
      accent:           'brown',
    }
]

export function getSmartCollection(slug: string): SmartCollectionDefinition | undefined {
    return SMART_COLLECTIONS.find(c => c.slug === slug)
}

/**
 * True when `today` falls inside the theme's season window. Themes with no
 * season are evergreen and always in-season.
 *
 * Windows that cross New Year (e.g. Dec 1 - Mar 19 for Winter) are detected
 * automatically by comparing `from` vs `to` month/day ordering.
 */
export function isInSeason(def: SmartCollectionDefinition, today: Date = new Date()): boolean {
    if (!def.season) return true
    const { from, to } = def.season
    const month = today.getMonth() + 1
    const day   = today.getDate()
    const now   = month * 100 + day
    const start = from.month * 100 + from.day
    const end   = to.month   * 100 + to.day
    return start <= end
        ? now >= start && now <= end
        : now >= start || now <= end   // wraps over Dec → Jan
}

/**
 * Days from today (UTC weekday numbering: Sunday = 0, Friday = 5, Saturday = 6).
 * Returns 7 instead of 0 so "next Friday" is never today.
 */
function nextWeekdayOffset(targetDay: number): number {
    const today = new Date().getUTCDay()
    const diff  = (targetDay - today + 7) % 7
    return diff === 0 ? 7 : diff
}
