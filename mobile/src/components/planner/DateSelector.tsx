import { useEffect, useMemo, useState } from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/theme/brand'

const OPTIONS = [
    { label: 'Today',      offset: 0 },
    { label: 'Tomorrow',   offset: 1 },
    { label: 'In 2 days',  offset: 2 },
    { label: 'In 3 days',  offset: 3 },
    { label: 'In 7 days',  offset: 7 },
    { label: 'In 2 weeks', offset: 14 },
    { label: 'In 1 month', offset: 30 },
]

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_MS = 1000 * 60 * 60 * 24

function plannerDate(): Date {
    const d = new Date()
    d.setHours(19, 0, 0, 0)
    return d
}

function selectedDateFromValue(value: string): Date {
    const d = new Date(value)
    return isNaN(d.getTime()) ? plannerDate() : d
}

function startOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

function sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate()
}

function sameMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function offsetToISO(offset: number): string {
    const d = plannerDate()
    d.setDate(d.getDate() + offset)
    return d.toISOString()
}

function isoToOffset(iso: string): number | null {
    const today = startOfDay(new Date())
    const target = startOfDay(selectedDateFromValue(iso))
    const diff = Math.round((target.getTime() - today.getTime()) / DAY_MS)
    return OPTIONS.find(o => o.offset === diff) ? diff : null
}

function formatDate(iso: string): string {
    return selectedDateFromValue(iso).toLocaleDateString('en-US', {
        weekday: 'short',
        month:   'short',
        day:     'numeric',
        year:    'numeric',
    })
}

function formatMonth(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function buildMonthDays(monthDate: Date): Array<Date | null> {
    const firstDay = startOfMonth(monthDate)
    const leading = firstDay.getDay()
    const total = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

    return Array.from({ length: leading + total }, (_, index) => {
        if (index < leading) return null
        return new Date(monthDate.getFullYear(), monthDate.getMonth(), index - leading + 1)
    })
}

interface Props {
    value:    string
    onChange: (iso: string) => void
}

export function DateSelector({ value, onChange }: Props) {
    const selectedDate = useMemo(() => selectedDateFromValue(value), [value])
    const selectedOffset = isoToOffset(value)
    const [calendarOpen, setCalendarOpen] = useState(selectedOffset === null)
    const [monthDate, setMonthDate] = useState(() => startOfMonth(selectedDate))

    useEffect(() => {
        setMonthDate(startOfMonth(selectedDate))
    }, [selectedDate.getFullYear(), selectedDate.getMonth()])

    const days = useMemo(() => buildMonthDays(monthDate), [monthDate])

    function moveMonth(delta: number) {
        setMonthDate(current => new Date(current.getFullYear(), current.getMonth() + delta, 1))
    }

    function selectDay(day: Date) {
        const next = new Date(day)
        next.setHours(
            selectedDate.getHours(),
            selectedDate.getMinutes(),
            selectedDate.getSeconds(),
            selectedDate.getMilliseconds()
        )
        onChange(next.toISOString())
    }

    return (
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
                {OPTIONS.map(opt => {
                    const active = selectedOffset === opt.offset
                    return (
                        <TouchableOpacity
                            key={opt.offset}
                            style={[s.chip, active && s.chipActive]}
                            onPress={() => {
                                onChange(offsetToISO(opt.offset))
                                setCalendarOpen(false)
                            }}
                            activeOpacity={0.75}
                        >
                            <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>

            <TouchableOpacity
                style={[s.pickerBtn, calendarOpen && s.pickerBtnActive]}
                onPress={() => setCalendarOpen(open => !open)}
                activeOpacity={0.75}
            >
                <Ionicons name="calendar-outline" size={16} color={calendarOpen ? C.bronze : C.mute} />
                <Text style={[s.pickerText, calendarOpen && s.pickerTextActive]}>
                    {selectedOffset === null ? formatDate(value) : 'Pick a date'}
                </Text>
                <Ionicons name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={16} color={C.mute} />
            </TouchableOpacity>

            {calendarOpen ? (
                <View style={s.calendar}>
                    <View style={s.calendarHeader}>
                        <TouchableOpacity style={s.navBtn} onPress={() => moveMonth(-1)} activeOpacity={0.75}>
                            <Ionicons name="chevron-back" size={18} color={C.bronze} />
                        </TouchableOpacity>
                        <View style={s.monthTitleWrap}>
                            <Text style={s.monthTitle}>{formatMonth(monthDate)}</Text>
                            <Text style={s.selected}>{formatDate(value)}</Text>
                        </View>
                        <TouchableOpacity style={s.navBtn} onPress={() => moveMonth(1)} activeOpacity={0.75}>
                            <Ionicons name="chevron-forward" size={18} color={C.bronze} />
                        </TouchableOpacity>
                    </View>

                    <View style={s.weekRow}>
                        {WEEKDAYS.map((weekday, index) => (
                            <Text key={`${weekday}-${index}`} style={s.weekday}>{weekday}</Text>
                        ))}
                    </View>

                    <View style={s.dayGrid}>
                        {days.map((day, index) => {
                            if (!day) return <View key={`empty-${index}`} style={s.dayCell} />

                            const selected = sameDay(day, selectedDate)
                            const today = sameDay(day, new Date())
                            const muted = !sameMonth(day, monthDate)

                            return (
                                <TouchableOpacity
                                    key={day.toISOString()}
                                    style={[s.dayCell, selected && s.dayCellActive]}
                                    onPress={() => selectDay(day)}
                                    activeOpacity={0.75}
                                >
                                    <Text
                                        style={[
                                            s.dayText,
                                            muted && s.dayTextMuted,
                                            today && s.dayTextToday,
                                            selected && s.dayTextActive,
                                        ]}
                                    >
                                        {day.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>
            ) : (
                <Text style={s.selectedCollapsed}>{formatDate(value)}</Text>
            )}
        </View>
    )
}

const s = StyleSheet.create({
    row:                 { gap: 8, paddingVertical: 4 },
    chip:                { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
    chipActive:          { borderColor: C.bronze, backgroundColor: C.bronze },
    chipText:            { fontSize: 13, color: C.ink },
    chipTextActive:      { color: '#fff', fontWeight: '600' },

    pickerBtn:           { marginTop: 10, minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
    pickerBtnActive:     { borderColor: C.bronze, backgroundColor: '#f5ece0' },
    pickerText:          { flex: 1, fontSize: 13, color: C.ink, fontWeight: '600' },
    pickerTextActive:    { color: C.bronze },

    calendar:            { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: C.borderWarm, backgroundColor: C.card, padding: 12 },
    calendarHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    navBtn:              { width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
    monthTitleWrap:      { alignItems: 'center' },
    monthTitle:          { fontSize: 14, fontWeight: '700', color: C.ink },
    selected:            { fontFamily: F.mono, fontSize: 10, color: C.mute, marginTop: 3 },
    selectedCollapsed:   { fontFamily: F.mono, fontSize: 11, color: C.mute, marginTop: 7 },

    weekRow:             { flexDirection: 'row', marginBottom: 4 },
    weekday:             { width: '14.2857%', textAlign: 'center', fontSize: 10, fontWeight: '700', color: C.mute },
    dayGrid:             { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell:             { width: '14.2857%', height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
    dayCellActive:       { backgroundColor: C.bronze },
    dayText:             { fontFamily: F.mono, fontSize: 12, fontWeight: '600', color: C.ink },
    dayTextMuted:        { color: C.mute },
    dayTextToday:        { color: C.bronze },
    dayTextActive:       { color: '#fff' },
})
