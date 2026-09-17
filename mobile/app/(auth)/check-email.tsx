import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/theme/brand'

export default function CheckEmailScreen() {
    const insets = useSafeAreaInsets()
    const { type, email, reason } = useLocalSearchParams<{
        type?: 'reset' | 'verify'
        email?: string
        reason?: 'created' | 'existing'
    }>()
    const isReset = type === 'reset'
    const emailText = typeof email === 'string' ? email : ''
    const isExisting = reason === 'existing'

    return (
        <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}>
            <View style={s.inner}>
                <View style={s.iconCircle}>
                    <Ionicons name="mail-outline" size={36} color={C.bronze} />
                </View>

                <View style={{ height: 24 }} />

                <Text style={s.eyebrow}>{isReset ? 'Password reset' : isExisting ? 'Account already exists' : 'Account created'}</Text>
                <View style={{ height: 8 }} />
                <Text style={s.headline}>Check your email</Text>
                <View style={{ height: 16 }} />

                <Text style={s.body}>
                    {isReset
                        ? "We've sent a password reset link to your email. Tap the link to set a new password."
                        : isExisting
                            ? "This email is already registered. If you haven't verified it yet, use the verification email before signing in."
                            : "We've sent a verification link to your email. Please verify your account before signing in."}
                </Text>
                {emailText ? (
                    <>
                        <View style={{ height: 12 }} />
                        <Text style={s.emailText}>{emailText}</Text>
                    </>
                ) : null}
                <View style={{ height: 12 }} />
                <Text style={s.hint}>
                    Didn't receive it? Check your spam or junk folder, then try again in a few minutes.
                </Text>

                <View style={{ height: 40 }} />

                <TouchableOpacity style={s.button} onPress={() => router.replace('/(auth)/sign-in')} activeOpacity={0.8}>
                    <Text style={s.buttonText}>Back to sign in</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const s = StyleSheet.create({
    root:       { flex: 1, backgroundColor: C.cream, justifyContent: 'center' },
    inner:      { paddingHorizontal: 32, alignItems: 'center' },

    iconCircle: { width: 80, height: 80, borderRadius: 28, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

    eyebrow:    { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze, textAlign: 'center' },
    headline:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 30, fontWeight: '400', color: C.ink, textAlign: 'center', lineHeight: 34 },

    body:       { fontSize: 15, color: C.ink, textAlign: 'center', lineHeight: 22 },
    emailText:  { fontSize: 14, color: C.bronze, textAlign: 'center', fontWeight: '700' },
    hint:       { fontSize: 13, color: C.mute, textAlign: 'center', lineHeight: 20 },

    button:     { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: C.card },
    buttonText: { fontSize: 14, fontWeight: '600', color: C.ink, textAlign: 'center' },
})
