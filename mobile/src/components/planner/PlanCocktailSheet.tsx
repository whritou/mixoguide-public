import { useState, useMemo } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
    ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useCocktails, useMakeableCocktails } from '@/features/cocktails/hooks'
import { useCreatePlannedCocktail } from '@/features/planner/hooks'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { DateSelector } from './DateSelector'
import { C, F, toneForId } from '@/theme/brand'
import { isMakeableCocktailNow, type CocktailDTO, type MakeableCocktail, type PlannedCocktailDTO } from '@mixoguide/shared'

interface Props {
    visible:              boolean
    onClose:              () => void
    preselectedCocktail?: CocktailDTO
    onSuccess?:           (plannedCocktail: PlannedCocktailDTO, quantity: number) => void
}

type Step = 'search' | 'schedule'

function offsetToISO(offset: number): string {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    d.setHours(19, 0, 0, 0)
    return d.toISOString()
}

export function PlanCocktailSheet({ visible, onClose, preselectedCocktail, onSuccess }: Props) {
    const [step, setStep]             = useState<Step>(preselectedCocktail ? 'schedule' : 'search')
    const [search, setSearch]         = useState('')
    const [selected, setSelected]     = useState<CocktailDTO | null>(preselectedCocktail ?? null)
    const [plannedFor, setPlannedFor] = useState(() => offsetToISO(0))
    const [quantity, setQuantity]     = useState(1)
    const [error, setError]           = useState<string | null>(null)

    const debouncedSearch = useDebouncedValue(search, 350)
    const { data, isFetching } = useCocktails({
        search:    debouncedSearch.trim() || undefined,
        limit:     20,
        sortBy:    'name',
        sortOrder: 'asc',
    }, visible && step === 'search')
    const { data: makeableList = [] } = useMakeableCocktails()
    const cocktails: CocktailDTO[] = data?.data ?? []

    const makeableMap = useMemo(() => {
        const map: Record<string, MakeableCocktail> = {}
        for (const m of makeableList) map[m.id] = m
        return map
    }, [makeableList])

    const createMutation = useCreatePlannedCocktail()
    const canConfirm = step === 'schedule' && !!selected && !createMutation.isPending

    function reset() {
        setStep(preselectedCocktail ? 'schedule' : 'search')
        setSearch('')
        setSelected(preselectedCocktail ?? null)
        setPlannedFor(offsetToISO(0))
        setQuantity(1)
        setError(null)
    }

    function handleClose() {
        reset()
        onClose()
    }

    function handleConfirm() {
        if (!selected) return
        setError(null)
        createMutation.mutate(
            { cocktailId: selected.id, plannedFor, quantity },
            {
                onSuccess: (res) => {
                    onSuccess?.(res.data.data, quantity)
                    handleClose()
                },
                onError: () => setError('Could not add to planner. Try again.'),
            }
        )
    }

    return (
        <SwipeableSheet visible={visible} onClose={handleClose}>
            <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity style={s.navBtnWrap} onPress={step === 'schedule' ? () => setStep('search') : handleClose}>
                        {step === 'schedule' && <Ionicons name="arrow-back" size={15} color={C.mute} />}
                        <Text style={s.navBtn}>{step === 'schedule' ? 'Back' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <View style={s.headerCenter}>
                        <Text style={s.eyebrow}>{step === 'search' ? 'Plan a cocktail' : 'Schedule'}</Text>
                        <Text style={s.title} numberOfLines={1}>
                            {step === 'search' ? 'Choose cocktail' : (selected?.name ?? '')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[s.saveBtn, !canConfirm && s.saveBtnDisabled]}
                        onPress={handleConfirm}
                        disabled={!canConfirm}
                    >
                        <Text style={[s.saveText, !canConfirm && s.saveTextDisabled]}>
                            {createMutation.isPending ? 'Saving...' : 'Add'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={s.divider} />

                {step === 'search' ? (
                    <>
                        {/* Search bar */}
                        <View style={s.searchOuter}>
                            <View style={s.searchWrap}>
                                <Ionicons name="search-outline" size={16} color={C.mute} />
                                <TextInput
                                    style={s.searchInput}
                                    placeholder="Search cocktails…"
                                    placeholderTextColor={C.mute}
                                    value={search}
                                    onChangeText={setSearch}
                                    autoFocus
                                    returnKeyType="search"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                />
                                {search.length > 0 ? (
                                    <TouchableOpacity
                                        onPress={() => setSearch('')}
                                        accessibilityRole="button"
                                        accessibilityLabel="Clear planned cocktail search"
                                        hitSlop={8}
                                    >
                                        <Ionicons name="close-circle" size={16} color={C.mute} />
                                    </TouchableOpacity>
                                ) : null}
                                {isFetching && <ActivityIndicator size="small" color={C.bronze} />}
                            </View>
                        </View>

                        {cocktails.length === 0 && !isFetching ? (
                            <View style={s.hint}>
                                <Ionicons name="beaker-outline" size={32} color={C.border} />
                                <Text style={s.hintText}>No cocktails found</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={cocktails}
                                keyExtractor={i => i.id}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={s.list}
                                renderItem={({ item }) => {
                                    const makeable = makeableMap[item.id]
                                    const bg = toneForId(item.id)
                                    return (
                                        <TouchableOpacity
                                            style={s.resultRow}
                                            onPress={() => { setSelected(item); setStep('schedule') }}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[s.avatar, { backgroundColor: bg }]}>
                                                <Text style={s.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                                            </View>
                                            <View style={s.resultInfo}>
                                                <Text style={s.resultName} numberOfLines={1}>{item.name}</Text>
                                                <View style={s.resultMetaRow}>
                                                    <Text style={s.resultMeta}>{item.difficulty}</Text>
                                                    {item.preparationTime ? (
                                                        <View style={s.resultMetaItem}>
                                                            <Ionicons name="time-outline" size={11} color={C.mute} />
                                                            <Text style={s.resultMeta}>{item.preparationTime} min</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                            {makeable ? (
                                                isMakeableCocktailNow(makeable) ? (
                                                    <View style={s.makeableBadge}>
                                                        <Text style={s.makeableBadgeText}>Ready</Text>
                                                    </View>
                                                ) : (
                                                    <View style={s.partialBadge}>
                                                        <Text style={s.partialBadgeText}>
                                                            {makeable.requiredCount - makeable.missingCount}/{makeable.requiredCount}
                                                        </Text>
                                                    </View>
                                                )
                                            ) : null}
                                            <Ionicons name="chevron-forward" size={18} color={C.mute} />
                                        </TouchableOpacity>
                                    )
                                }}
                            />
                        )}
                    </>
                ) : (
                    <ScrollView
                        style={s.scheduleScroll}
                        contentContainerStyle={s.scheduleStep}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={s.section}>
                            <Text style={s.sectionLabel}>When?</Text>
                            <DateSelector value={plannedFor} onChange={setPlannedFor} />
                        </View>

                        <View style={s.section}>
                            <Text style={s.sectionLabel}>Servings</Text>
                            <View style={s.qtyRow}>
                                <TouchableOpacity style={s.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
                                    <Ionicons name="remove" size={20} color={C.ink} />
                                </TouchableOpacity>
                                <Text style={s.qtyValue}>{quantity}</Text>
                                <TouchableOpacity style={s.qtyBtn} onPress={() => setQuantity(q => Math.min(50, q + 1))}>
                                    <Ionicons name="add" size={20} color={C.ink} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {error ? (
                            <Text style={s.errorText}>{error}</Text>
                        ) : null}
                    </ScrollView>
                )}
            </KeyboardAvoidingView>
        </SwipeableSheet>
    )
}

const s = StyleSheet.create({
    container:      { flex: 1, backgroundColor: C.cream },

    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
    headerCenter:   { alignItems: 'center', flex: 1 },
    eyebrow:        { fontSize: 8, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: C.bronze, marginBottom: 2 },
    title:          { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink },

    navBtnWrap:     { width: 58, flexDirection: 'row', alignItems: 'center', gap: 3 },
    navBtn:         { fontSize: 13, color: C.mute, fontWeight: '500' },
    saveBtn:        { minWidth: 76, height: 38, borderRadius: 19, paddingHorizontal: 14, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center' },
    saveBtnDisabled:{ backgroundColor: C.creamWarm },
    saveText:       { fontSize: 12, fontWeight: '800', color: '#f5ece0', letterSpacing: 0.8, textTransform: 'uppercase' },
    saveTextDisabled:{ color: C.mute },

    divider:        { height: 1, backgroundColor: C.border },

    searchOuter:    { paddingHorizontal: 16, paddingVertical: 8 },
    searchWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 0, minHeight: 38, borderWidth: 1, borderColor: C.border, gap: 8 },
    searchInput:    { flex: 1, height: 36, paddingVertical: 0, fontSize: 14, color: C.ink },

    hint:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
    hintText:       { fontSize: 14, color: C.mute },

    list:           { paddingHorizontal: 16, paddingTop: 4 },

    resultRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
    avatar:         { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarText:     { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    resultInfo:     { flex: 1, minWidth: 0 },
    resultName:     { fontSize: 15, fontWeight: '600', color: C.ink },
    resultMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    resultMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    resultMeta:     { fontSize: 11, color: C.mute, textTransform: 'capitalize' },

    makeableBadge:     { backgroundColor: '#e8ece0', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    makeableBadgeText: { fontSize: 10, fontWeight: '700', color: '#6a7a5a', letterSpacing: 0.5 },
    partialBadge:      { backgroundColor: C.amber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    partialBadgeText:  { fontFamily: F.mono, fontSize: 10, fontWeight: '700', color: C.bronze },

    scheduleScroll: { flex: 1 },
    scheduleStep:   { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
    section:        { marginTop: 20 },
    sectionLabel:   { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.mute, marginBottom: 10 },

    qtyRow:         { flexDirection: 'row', alignItems: 'center', gap: 20 },
    qtyBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    qtyValue:       { fontFamily: F.mono, fontSize: 26, fontWeight: '700', color: C.ink, minWidth: 36, textAlign: 'center' },

    errorText:      { marginTop: 10, fontSize: 12, color: '#a8472a', textAlign: 'center' },
})
