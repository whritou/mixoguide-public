import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COCKTAIL_DIFFICULTIES, COCKTAIL_FLAVORS, COCKTAIL_OCCASIONS } from '@mixoguide/shared'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { C, F } from '@/theme/brand'

export interface FilterState {
    difficulty:    string | null
    isAlcoholic:   boolean | null
    flavors:       string[]
    occasions:     string[]
    onlyMakeable:  boolean
    onlyFavorites: boolean
    sortBy:        string | null
    sortOrder:     'asc' | 'desc'
}

export const DEFAULT_FILTERS: FilterState = {
    difficulty:    null,
    isAlcoholic:   null,
    flavors:       [],
    occasions:     [],
    onlyMakeable:  false,
    onlyFavorites: false,
    sortBy:        null,
    sortOrder:     'asc',
}

const SORT_OPTIONS = [
    { label: 'Highest rated', sortBy: 'avgRating',       sortOrder: 'desc' as const },
    { label: 'Most popular',  sortBy: 'ratingCount',     sortOrder: 'desc' as const },
    { label: 'Quickest',      sortBy: 'preparationTime', sortOrder: 'asc'  as const },
    { label: 'Newest',        sortBy: 'createdAt',       sortOrder: 'desc' as const },
    { label: 'A–Z',           sortBy: 'name',            sortOrder: 'asc'  as const },
]

const ABV_OPTIONS = [
    { label: 'All',           value: null  as boolean | null },
    { label: 'Alcoholic',     value: true  as boolean | null },
    { label: 'Non-alcoholic', value: false as boolean | null },
]

function fmt(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface Props {
    visible:  boolean
    filters:  FilterState
    onChange: (f: FilterState) => void
    onClose:  () => void
}

export function FilterSheet({ visible, filters, onChange, onClose }: Props) {
    const insets = useSafeAreaInsets()

    const activeCount =
        (filters.difficulty ? 1 : 0) +
        (filters.isAlcoholic !== null ? 1 : 0) +
        filters.flavors.length +
        filters.occasions.length +
        (filters.onlyMakeable  ? 1 : 0) +
        (filters.onlyFavorites ? 1 : 0)

    const toggleFlavor = (f: string) => {
        const next = filters.flavors.includes(f)
            ? filters.flavors.filter(x => x !== f)
            : [...filters.flavors, f]
        onChange({ ...filters, flavors: next })
    }

    const toggleOccasion = (o: string) => {
        const next = filters.occasions.includes(o)
            ? filters.occasions.filter(x => x !== o)
            : [...filters.occasions, o]
        onChange({ ...filters, occasions: next })
    }

    return (
        <SwipeableSheet visible={visible} onClose={onClose}>
            <View style={[s.root, { paddingBottom: insets.bottom }]}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity style={s.resetBtn} onPress={() => onChange(DEFAULT_FILTERS)}>
                        <Text style={s.resetText}>
                            {activeCount > 0 ? `Reset (${activeCount})` : 'Reset'}
                        </Text>
                    </TouchableOpacity>

                    <View style={s.headerCenter}>
                        <Text style={s.eyebrow}>Sort &amp; filter</Text>
                        <Text style={s.title}>Filters</Text>
                    </View>

                    <TouchableOpacity style={s.doneBtn} onPress={onClose}>
                        <Text style={s.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={s.divider} />

                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

                    {/* Sort */}
                    <Section label="Sort by">
                        <View style={s.chipRow}>
                            {SORT_OPTIONS.map(opt => {
                                const active = (
                                    (filters.sortBy === null && opt.sortBy === 'avgRating' && opt.sortOrder === 'desc') ||
                                    (filters.sortBy === opt.sortBy && filters.sortOrder === opt.sortOrder)
                                )
                                return (
                                    <Chip
                                        key={opt.label}
                                        label={opt.label}
                                        active={active}
                                        onPress={() => onChange({ ...filters, sortBy: opt.sortBy, sortOrder: opt.sortOrder })}
                                    />
                                )
                            })}
                        </View>
                    </Section>

                    {/* Show only */}
                    <Section label="Show only">
                        <View style={s.chipRow}>
                            <Chip
                                label="Ready to mix"
                                active={filters.onlyMakeable}
                                onPress={() => onChange({ ...filters, onlyMakeable: !filters.onlyMakeable })}
                            />
                            <Chip
                                label="Favorites"
                                active={filters.onlyFavorites}
                                onPress={() => onChange({ ...filters, onlyFavorites: !filters.onlyFavorites })}
                            />
                        </View>
                    </Section>

                    {/* Difficulty */}
                    <Section label="Difficulty">
                        <View style={s.chipRow}>
                            {COCKTAIL_DIFFICULTIES.map(d => (
                                <Chip
                                    key={d}
                                    label={fmt(d)}
                                    active={filters.difficulty === d}
                                    onPress={() => onChange({ ...filters, difficulty: filters.difficulty === d ? null : d })}
                                />
                            ))}
                        </View>
                    </Section>

                    {/* Alcohol */}
                    <Section label="Alcohol">
                        <View style={s.chipRow}>
                            {ABV_OPTIONS.map(opt => (
                                <Chip
                                    key={String(opt.value)}
                                    label={opt.label}
                                    active={filters.isAlcoholic === opt.value}
                                    onPress={() => onChange({ ...filters, isAlcoholic: opt.value })}
                                />
                            ))}
                        </View>
                    </Section>

                    {/* Flavors */}
                    <Section label="Flavors">
                        <View style={s.chipRow}>
                            {[...COCKTAIL_FLAVORS].map(f => (
                                <Chip
                                    key={f}
                                    label={fmt(f)}
                                    active={filters.flavors.includes(f)}
                                    onPress={() => toggleFlavor(f)}
                                />
                            ))}
                        </View>
                    </Section>

                    {/* Occasions */}
                    <Section label="Occasions">
                        <View style={s.chipRow}>
                            {[...COCKTAIL_OCCASIONS].slice(0, 20).map(o => (
                                <Chip
                                    key={o}
                                    label={fmt(o)}
                                    active={filters.occasions.includes(o)}
                                    onPress={() => toggleOccasion(o)}
                                />
                            ))}
                        </View>
                    </Section>

                    <View style={{ height: 48 }} />
                </ScrollView>
            </View>
        </SwipeableSheet>
    )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={s.section}>
            <Text style={s.sectionLabel}>{label}</Text>
            {children}
        </View>
    )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={[s.chip, active && s.chipActive]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    )
}

const s = StyleSheet.create({
    root:           { flex: 1, backgroundColor: C.cream },

    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
    headerCenter:   { alignItems: 'center', flex: 1 },
    eyebrow:        { fontSize: 8, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: C.bronze, marginBottom: 2 },
    title:          { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink },

    resetBtn:       { minWidth: 76 },
    resetText:      { fontSize: 13, color: C.mute, fontWeight: '500' },
    doneBtn:        { minWidth: 76, height: 38, borderRadius: 19, paddingHorizontal: 14, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center' },
    doneText:       { fontSize: 12, fontWeight: '800', color: '#f5ece0', letterSpacing: 0.8, textTransform: 'uppercase' },

    divider:        { height: 1, backgroundColor: C.border, marginHorizontal: 0 },
    scroll:         { flex: 1, paddingHorizontal: 16 },

    section:        { marginTop: 20, marginBottom: 4 },
    sectionLabel:   { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.mute, marginBottom: 12 },
    chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    chip:           { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: C.cream },
    chipActive:     { borderColor: C.bronze, backgroundColor: C.bronze },
    chipText:       { fontSize: 13, color: C.ink, fontWeight: '400' },
    chipTextActive: { color: '#fff', fontWeight: '600' },
})
