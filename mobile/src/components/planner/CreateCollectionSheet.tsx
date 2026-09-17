import { useState, useEffect } from 'react'
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCreatePlannedCollection } from '@/features/planner/hooks'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { DateSelector } from './DateSelector'
import { COCKTAIL_OCCASIONS, type PlannedCollectionDTO } from '@mixoguide/shared'
import { C, F } from '@/theme/brand'

function offsetToISO(offset: number): string {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    d.setHours(19, 0, 0, 0)
    return d.toISOString()
}

function fmt(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export interface CreateCollectionInitialValues {
    title?: string
    plannedFor?: string
    servings?: number
    occasions?: string[]
    cocktailIds?: string[]
}

interface Props {
    visible: boolean
    onClose: () => void
    initialValues?: CreateCollectionInitialValues
    onCreated?: (collection: PlannedCollectionDTO) => void
}

export function CreateCollectionSheet({ visible, onClose, initialValues, onCreated }: Props) {
    const [title, setTitle]           = useState('')
    const [plannedFor, setPlannedFor] = useState(() => offsetToISO(7))
    const [servings, setServings]     = useState(4)
    const [occasions, setOccasions]   = useState<string[]>([])
    const [cocktailIds, setCocktailIds] = useState<string[]>([])

    const createMutation = useCreatePlannedCollection()

    useEffect(() => {
        if (visible) {
            setTitle(initialValues?.title ?? '')
            setPlannedFor(initialValues?.plannedFor ?? offsetToISO(7))
            setServings(initialValues?.servings ?? 4)
            setOccasions(initialValues?.occasions ?? [])
            setCocktailIds(initialValues?.cocktailIds ?? [])
        }
    }, [visible])

    function reset() {
        setTitle('')
        setPlannedFor(offsetToISO(7))
        setServings(4)
        setOccasions([])
        setCocktailIds([])
    }

    function handleClose() {
        reset()
        onClose()
    }

    function toggleOccasion(o: string) {
        setOccasions(prev =>
            prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]
        )
    }

    function handleCreate() {
        if (!title.trim()) return
        createMutation.mutate(
            {
                title:    title.trim(),
                plannedFor,
                servings,
                occasions,
                ...(cocktailIds.length > 0 ? { cocktailIds } : {}),
            },
            {
                onSuccess: (response) => {
                    handleClose()
                    onCreated?.(response.data.data)
                },
            }
        )
    }

    const valid = title.trim().length > 0

    return (
        <SwipeableSheet visible={visible} onClose={handleClose}>
            <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
                        <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <View style={s.headerCenter}>
                        <Text style={s.eyebrow}>New event</Text>
                        <Text style={s.title}>Collection</Text>
                    </View>
                    <TouchableOpacity
                        style={[s.saveBtn, (!valid || createMutation.isPending) && s.saveBtnDisabled]}
                        onPress={handleCreate}
                        disabled={!valid || createMutation.isPending}
                    >
                        <Text style={[s.saveText, (!valid || createMutation.isPending) && s.saveTextDisabled]}>
                            {createMutation.isPending ? 'Saving…' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={s.divider} />

                <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    <Section label="Title">
                        <TextInput
                            style={s.input}
                            placeholder="e.g. Saturday party"
                            placeholderTextColor={C.mute}
                            value={title}
                            onChangeText={setTitle}
                            autoFocus
                            returnKeyType="next"
                            maxLength={200}
                        />
                    </Section>

                    <Section label="Date">
                        <DateSelector value={plannedFor} onChange={setPlannedFor} />
                    </Section>

                    <Section label="Servings">
                        <View style={s.qtyRow}>
                            <TouchableOpacity style={s.qtyBtn} onPress={() => setServings(n => Math.max(1, n - 1))}>
                                <Ionicons name="remove" size={20} color={C.ink} />
                            </TouchableOpacity>
                            <Text style={s.qtyValue}>{servings}</Text>
                            <TouchableOpacity style={s.qtyBtn} onPress={() => setServings(n => Math.min(500, n + 1))}>
                                <Ionicons name="add" size={20} color={C.ink} />
                            </TouchableOpacity>
                            <Text style={s.qtyUnit}>people</Text>
                        </View>
                    </Section>

                    <Section label="Occasions" optional>
                        <View style={s.chipRow}>
                            {[...COCKTAIL_OCCASIONS].slice(0, 20).map(o => {
                                const active = occasions.includes(o)
                                return (
                                    <TouchableOpacity
                                        key={o}
                                        style={[s.chip, active && s.chipActive]}
                                        onPress={() => toggleOccasion(o)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[s.chipText, active && s.chipTextActive]}>{fmt(o)}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </Section>

                    <View style={{ height: 48 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SwipeableSheet>
    )
}

function Section({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
    return (
        <View style={s.section}>
            <View style={s.sectionLabelRow}>
                <Text style={s.sectionLabel}>{label}</Text>
                {optional && <Text style={s.optionalText}>optional</Text>}
            </View>
            {children}
        </View>
    )
}

const s = StyleSheet.create({
    container:       { flex: 1, backgroundColor: C.cream },

    header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
    headerCenter:    { alignItems: 'center', flex: 1 },
    eyebrow:         { fontSize: 8, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: C.bronze, marginBottom: 2 },
    title:           { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink },

    cancelBtn:       { minWidth: 76 },
    cancelText:      { fontSize: 13, color: C.mute, fontWeight: '500' },
    saveBtn:         { minWidth: 76, height: 38, borderRadius: 19, paddingHorizontal: 14, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center' },
    saveBtnDisabled: { backgroundColor: C.creamWarm },
    saveText:        { fontSize: 12, fontWeight: '800', color: '#f5ece0', letterSpacing: 0.8, textTransform: 'uppercase' },
    saveTextDisabled:{ color: C.mute },

    divider:         { height: 1, backgroundColor: C.border },
    scroll:          { flex: 1, paddingHorizontal: 16 },

    section:         { marginTop: 20, marginBottom: 4 },
    sectionLabelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
    sectionLabel:    { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.mute },
    optionalText:    { fontSize: 11, color: C.mute, fontWeight: '400' },

    input:           { backgroundColor: C.card, borderRadius: 12, padding: 12, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: C.border },

    qtyRow:          { flexDirection: 'row', alignItems: 'center', gap: 16 },
    qtyBtn:          { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    qtyValue:        { fontFamily: F.mono, fontSize: 22, fontWeight: '700', color: C.ink, minWidth: 32, textAlign: 'center' },
    qtyUnit:         { fontSize: 13, color: C.mute },

    chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:            { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: C.cream },
    chipActive:      { borderColor: C.bronze, backgroundColor: C.bronze },
    chipText:        { fontSize: 13, color: C.ink, fontWeight: '400' },
    chipTextActive:  { color: '#fff', fontWeight: '600' },
})
