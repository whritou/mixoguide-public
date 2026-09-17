import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/theme/brand'

type QuantityStepperProps = {
    value: number
    unit?: string | null
    label?: string
    min?: number
    step?: number
    onChange: (next: number) => void
    decreaseLabel: string
    increaseLabel: string
}

const HOLD_START_DELAY_MS = 350
const HOLD_INITIAL_REPEAT_MS = 170
const HOLD_MIN_REPEAT_MS = 35
const HOLD_DELAY_DECAY_MS = 900
const HOLD_MULTIPLIER_GROWTH_MS = 1400
const HOLD_MAX_MULTIPLIER = 10

function normalizeQuantity(value: number, min: number): number {
    return Math.max(min, Math.round(value * 100) / 100)
}

function formatQuantity(value: number): string {
    return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, '').replace(/\.$/, '')
}

export function QuantityStepper({
    value,
    unit,
    label = 'Qty',
    min = 0.01,
    step = 1,
    onChange,
    decreaseLabel,
    increaseLabel,
}: QuantityStepperProps) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(formatQuantity(value))
    const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const holdRepeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const holdStartedAt = useRef(0)
    const currentValue = useRef(value)
    const repeated = useRef(false)

    useEffect(() => {
        currentValue.current = value
        if (!editing) setDraft(formatQuantity(value))
    }, [editing, value])

    useEffect(() => {
        return stopHold
    }, [])

    function stopHold() {
        if (holdTimeout.current) clearTimeout(holdTimeout.current)
        if (holdRepeatTimer.current) clearTimeout(holdRepeatTimer.current)
        holdTimeout.current = null
        holdRepeatTimer.current = null
    }

    function adjust(delta: number) {
        const next = normalizeQuantity(currentValue.current + delta, min)
        currentValue.current = next
        onChange(next)
    }

    function holdMultiplier(elapsedMs: number): number {
        return Math.min(
            HOLD_MAX_MULTIPLIER,
            Math.max(1, Math.floor(Math.exp(elapsedMs / HOLD_MULTIPLIER_GROWTH_MS))),
        )
    }

    function holdDelay(elapsedMs: number): number {
        return Math.max(
            HOLD_MIN_REPEAT_MS,
            Math.round(HOLD_INITIAL_REPEAT_MS * Math.exp(-elapsedMs / HOLD_DELAY_DECAY_MS)),
        )
    }

    function scheduleAcceleratedRepeat(delta: number) {
        const elapsed = Date.now() - holdStartedAt.current
        adjust(delta * holdMultiplier(elapsed))
        holdRepeatTimer.current = setTimeout(() => scheduleAcceleratedRepeat(delta), holdDelay(elapsed))
    }

    function startHold(delta: number) {
        stopHold()
        repeated.current = false
        holdStartedAt.current = Date.now()
        holdTimeout.current = setTimeout(() => {
            repeated.current = true
            scheduleAcceleratedRepeat(delta)
        }, HOLD_START_DELAY_MS)
    }

    function handlePress(delta: number) {
        if (!repeated.current) adjust(delta)
    }

    function beginEdit() {
        stopHold()
        setDraft(formatQuantity(value))
        setEditing(true)
    }

    function commitEdit() {
        const parsed = Number.parseFloat(draft.replace(',', '.'))
        if (Number.isFinite(parsed)) {
            const next = normalizeQuantity(parsed, min)
            currentValue.current = next
            onChange(next)
        }
        setEditing(false)
    }

    return (
        <View style={s.row}>
            <Text style={s.label}>{label}</Text>
            <StepButton
                icon="remove"
                label={decreaseLabel}
                onPress={() => handlePress(-step)}
                onPressIn={() => startHold(-step)}
                onPressOut={stopHold}
            />
            {editing ? (
                <TextInput
                    style={s.input}
                    value={draft}
                    onChangeText={setDraft}
                    autoFocus
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    returnKeyType="done"
                    onBlur={commitEdit}
                    onSubmitEditing={commitEdit}
                    accessibilityLabel={`${label} quantity`}
                />
            ) : (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${label.toLowerCase()} quantity`}
                    onPress={beginEdit}
                    style={({ pressed }) => [s.valueButton, pressed && s.pressed]}
                >
                    <Text style={s.valueText}>{formatQuantity(value)}</Text>
                </Pressable>
            )}
            {unit ? <Text style={s.unit}>{unit}</Text> : null}
            <StepButton
                icon="add"
                label={increaseLabel}
                onPress={() => handlePress(step)}
                onPressIn={() => startHold(step)}
                onPressOut={stopHold}
            />
        </View>
    )
}

function StepButton({
    icon,
    label,
    onPress,
    onPressIn,
    onPressOut,
}: {
    icon: 'add' | 'remove'
    label: string
    onPress: () => void
    onPressIn: () => void
    onPressOut: () => void
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={({ pressed }) => [s.step, pressed && s.pressed]}
            hitSlop={6}
        >
            <Ionicons name={icon} size={14} color={C.ink} />
        </Pressable>
    )
}

const s = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        fontSize: 9,
        fontWeight: '600',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: C.mute,
    },
    step: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: C.creamWarm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.border,
    },
    valueButton: {
        minWidth: 34,
        minHeight: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingHorizontal: 6,
    },
    valueText: {
        fontFamily: F.mono,
        fontSize: 13,
        color: C.ink,
        textAlign: 'center',
    },
    input: {
        minWidth: 48,
        height: 32,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.bronzeLight,
        backgroundColor: C.card,
        paddingHorizontal: 6,
        paddingVertical: 0,
        fontFamily: F.mono,
        fontSize: 13,
        color: C.ink,
        textAlign: 'center',
    },
    unit: {
        fontSize: 11,
        color: C.mute,
    },
    pressed: {
        opacity: 0.68,
    },
})
