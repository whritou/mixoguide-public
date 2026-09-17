import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIngredientTypes, useIngredientSubTypes } from '@/features/ingredients/hooks'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { C, F } from '@/theme/brand'

export interface IngredientFilterState {
    types:       string[]
    subTypes:    string[]
    isAlcoholic: boolean | null
    sortBy:      'name' | 'abv'
    sortOrder:   'asc' | 'desc'
}

export const DEFAULT_INGREDIENT_FILTERS: IngredientFilterState = {
    types:       [],
    subTypes:    [],
    isAlcoholic: null,
    sortBy:      'name',
    sortOrder:   'asc',
}

const SORT_OPTIONS = [
    { label: 'A – Z',         sortBy: 'name' as const, sortOrder: 'asc'  as const },
    { label: 'Z – A',         sortBy: 'name' as const, sortOrder: 'desc' as const },
    { label: 'Highest ABV',   sortBy: 'abv'  as const, sortOrder: 'desc' as const },
    { label: 'Lowest ABV',    sortBy: 'abv'  as const, sortOrder: 'asc'  as const },
]

const ABV_OPTIONS: { label: string; value: boolean | null }[] = [
    { label: 'All',           value: null  },
    { label: 'Alcoholic',     value: true  },
    { label: 'Non-alcoholic', value: false },
]

interface Props {
    visible:  boolean
    filters:  IngredientFilterState
    onChange: (f: IngredientFilterState) => void
    onClose:  () => void
}

export function IngredientFilterSheet({ visible, filters, onChange, onClose }: Props) {
    const insets = useSafeAreaInsets()
    const { data: types = [],    isLoading: typesLoading }    = useIngredientTypes()
    const { data: subTypes = [], isLoading: subTypesLoading } = useIngredientSubTypes()

    const activeCount =
        filters.types.length +
        filters.subTypes.length +
        (filters.isAlcoholic !== null ? 1 : 0)

    function toggleType(name: string) {
        const next = filters.types.includes(name)
            ? filters.types.filter(t => t !== name)
            : [...filters.types, name]
        onChange({ ...filters, types: next })
    }

    function toggleSubType(name: string) {
        const next = filters.subTypes.includes(name)
            ? filters.subTypes.filter(t => t !== name)
            : [...filters.subTypes, name]
        onChange({ ...filters, subTypes: next })
    }

    return (
        <SwipeableSheet visible={visible} onClose={onClose}>
            <View style={[s.root, { paddingBottom: insets.bottom }]}>
                <View style={s.header}>
                    <TouchableOpacity style={s.resetBtn} onPress={() => onChange(DEFAULT_INGREDIENT_FILTERS)}>
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

                <View style={s.divider} />

                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

                    <Section label="Sort by">
                        <View style={s.chipRow}>
                            {SORT_OPTIONS.map(opt => {
                                const active = filters.sortBy === opt.sortBy && filters.sortOrder === opt.sortOrder
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

                    <Section label="Type">
                        {typesLoading ? (
                            <ActivityIndicator size="small" color={C.bronze} style={{ alignSelf: 'flex-start' }} />
                        ) : (
                            <View style={s.chipRow}>
                                {types.map(t => (
                                    <Chip
                                        key={t.id}
                                        label={t.name}
                                        active={filters.types.includes(t.name)}
                                        onPress={() => toggleType(t.name)}
                                    />
                                ))}
                            </View>
                        )}
                    </Section>

                    <Section label="Sub-type">
                        {subTypesLoading ? (
                            <ActivityIndicator size="small" color={C.bronze} style={{ alignSelf: 'flex-start' }} />
                        ) : (
                            <View style={s.chipRow}>
                                {subTypes.map(st => (
                                    <Chip
                                        key={st.id}
                                        label={st.name}
                                        active={filters.subTypes.includes(st.name)}
                                        onPress={() => toggleSubType(st.name)}
                                    />
                                ))}
                            </View>
                        )}
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

    divider:        { height: 1, backgroundColor: C.border },
    scroll:         { flex: 1, paddingHorizontal: 16 },

    section:        { marginTop: 20, marginBottom: 4 },
    sectionLabel:   { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.mute, marginBottom: 12 },
    chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    chip:           { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: C.cream },
    chipActive:     { borderColor: C.bronze, backgroundColor: C.bronze },
    chipText:       { fontSize: 13, color: C.ink, fontWeight: '400' },
    chipTextActive: { color: '#fff', fontWeight: '600' },
})
