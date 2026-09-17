import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { captureException } from '@/lib/sentry'
import { C, F } from '@/theme/brand'

// ── Tilted-bottle illustration ──────────────────────────────────────────────
function BottleIllustration() {
    return (
        <View style={il.wrap}>
            {/* Spilled puddle */}
            <View style={il.puddle} />

            {/* Tilted bottle group */}
            <View style={il.bottleGroup}>
                {/* Body */}
                <View style={il.bottleBody}>
                    {/* Label area */}
                    <View style={il.bottleLabel}>
                        <Text style={il.bottleCode}>404</Text>
                    </View>
                </View>
                {/* Neck */}
                <View style={il.bottleNeck} />
                {/* Cap */}
                <View style={il.bottleCap} />
            </View>

            {/* Drip dots */}
            <View style={[il.drip, { right: 32, bottom: 48 }]} />
            <View style={[il.drip, { right: 18, bottom: 36, width: 6, height: 6, borderRadius: 3 }]} />
        </View>
    )
}

// ── Error screen UI (used by both class boundary and hook-based callers) ────
export function ErrorScreen({
    message,
    errorRef,
    onRetry,
    onHome,
}: {
    message?: string
    errorRef?: string
    onRetry?: () => void
    onHome?:  () => void
}) {
    const insets = useSafeAreaInsets()
    const ref    = errorRef ?? `MG-${Math.random().toString(16).slice(2, 6).toUpperCase()} · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} GMT`

    return (
        <ScrollView
            style={[s.root, { paddingTop: insets.top }]}
            contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Top bar */}
            <View style={s.topBar}>
                <TouchableOpacity onPress={onHome ?? (() => router.replace('/(tabs)'))}>
                    <Text style={s.topBack}>‹ Back</Text>
                </TouchableOpacity>
            </View>

            {/* Illustration */}
            <View style={s.illustrationWrap}>
                <BottleIllustration />
            </View>

            {/* Copy */}
            <Text style={s.eyebrow}>Error · 500</Text>
            <View style={{ height: 12 }} />
            <Text style={s.headline}>Something{'\n'}spilled</Text>
            <View style={{ height: 16 }} />
            <Text style={s.body}>
                {message ?? "Our cellar took a knock and we couldn't fetch your library. Give it a moment and try again — your pantry is safe."}
            </Text>

            <View style={{ flex: 1, minHeight: 28 }} />

            {/* Reference card */}
            <View style={s.refCard}>
                <View>
                    <Text style={s.refEyebrow}>Reference</Text>
                    <Text style={s.refCode}>{ref}</Text>
                </View>
            </View>

            <View style={{ height: 16 }} />

            {/* CTA */}
            <TouchableOpacity style={s.primaryBtn} onPress={onRetry}>
                <Text style={s.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
            <View style={{ height: 10 }} />
            <TouchableOpacity onPress={onHome ?? (() => router.replace('/(tabs)'))}>
                <Text style={s.secondaryBtn}>Back to home</Text>
            </TouchableOpacity>
        </ScrollView>
    )
}

// ── Class-based boundary that wraps the whole app ───────────────────────────
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
    state: State = { hasError: false, error: null }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        captureException(error, { componentStack: info.componentStack ?? undefined })
    }

    retry = () => this.setState({ hasError: false, error: null })

    render() {
        if (!this.state.hasError) return this.props.children
        return (
            <ErrorScreen
                message={__DEV__ && this.state.error?.message ? this.state.error.message : undefined}
                onRetry={this.retry}
                onHome={this.retry}
            />
        )
    }
}

// ── Styles ──────────────────────────────────────────────────────────────────
const il = StyleSheet.create({
    wrap:        { width: 160, height: 180, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
    puddle:      { position: 'absolute', bottom: 0, left: 10, right: 10, height: 12, borderRadius: 8, backgroundColor: C.bronze, opacity: 0.12 },
    bottleGroup: { transform: [{ rotate: '-22deg' }], alignItems: 'center', marginBottom: 14 },
    bottleBody:  { width: 28, height: 72, borderRadius: 6, backgroundColor: C.amber, borderWidth: 1.2, borderColor: C.bronze, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    bottleLabel: { width: 20, height: 34, backgroundColor: C.card, borderRadius: 2, borderWidth: 0.8, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    bottleCode:  { fontFamily: F.head, fontStyle: 'italic', fontSize: 9, color: C.bronze },
    bottleNeck:  { width: 16, height: 20, borderRadius: 2, backgroundColor: C.bronze, opacity: 0.85 },
    bottleCap:   { width: 18, height: 8, borderRadius: 2, backgroundColor: C.bronze },
    drip:        { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: C.bronzeLight },
})

const s = StyleSheet.create({
    root:             { flex: 1, backgroundColor: C.cream },
    scroll:           { paddingHorizontal: 28, paddingTop: 0 },

    topBar:           { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 52 },
    topBack:          { fontSize: 13, fontWeight: '600', color: C.mute },

    illustrationWrap: { alignItems: 'center', marginBottom: 28 },

    eyebrow:          { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:         { fontFamily: F.head, fontStyle: 'italic', fontSize: 36, fontWeight: '400', color: C.ink, lineHeight: 40 },
    body:             { fontSize: 14, color: C.mute, lineHeight: 22 },

    refCard:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.creamWarm, borderRadius: 12, borderWidth: 1, borderColor: C.borderWarm, padding: 14 },
    refEyebrow:       { fontSize: 9, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.mute, marginBottom: 4 },
    refCode:          { fontFamily: F.mono, fontSize: 11, color: C.ink },

    primaryBtn:       { backgroundColor: C.bronze, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    primaryBtnText:   { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#fff' },
    secondaryBtn:     { textAlign: 'center', fontSize: 12, fontWeight: '600', color: C.mute, paddingVertical: 6 },
})
