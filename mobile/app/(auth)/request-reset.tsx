import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { z } from 'zod'
import { emailSchema } from '@mixoguide/shared'
import { authApi } from '@/api/endpoints/auth'
import { C, F } from '@/theme/brand'

const schema = z.object({ email: emailSchema })
type Input = z.infer<typeof schema>

export default function RequestResetScreen() {
    const insets = useSafeAreaInsets()
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input>({
        resolver: zodResolver(schema),
    })

    const onSubmit = async (data: Input) => {
        await authApi.requestReset(data.email).catch(() => {})
        // Always navigate to check-email — don't reveal whether the address exists
        router.replace({
            pathname: '/(auth)/check-email',
            params: { type: 'reset', email: data.email },
        })
    }

    return (
        <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[s.header, { paddingTop: insets.top + 24 }]}>
                    <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={17} color={C.mute} />
                        <Text style={s.backText}>Back</Text>
                    </TouchableOpacity>
                    <View style={{ height: 20 }} />
                    <Text style={s.eyebrow}>Account recovery</Text>
                    <View style={{ height: 8 }} />
                    <Text style={s.headline}>Reset password</Text>
                    <View style={{ height: 6 }} />
                    <Text style={s.subline}>Enter your email and we'll send you a link to reset your password.</Text>
                </View>

                {/* Email input */}
                <View style={s.section}>
                    <Text style={s.label}>Email</Text>
                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[s.input, errors.email && s.inputError]}
                                placeholder="you@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoFocus
                                placeholderTextColor={C.mute}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.email && <Text style={s.errorText}>{errors.email.message}</Text>}
                </View>

                {/* Submit button */}
                <View style={s.section}>
                    <TouchableOpacity
                        style={[s.primaryButton, isSubmitting && s.buttonDisabled]}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                    >
                        <Text style={s.primaryButtonText}>{isSubmitting ? 'Sending…' : 'Send reset link'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const s = StyleSheet.create({
    root:              { flex: 1, backgroundColor: C.cream },
    scroll:            { flexGrow: 1, paddingHorizontal: 24 },

    header:            { paddingBottom: 32 },
    backRow:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText:          { fontSize: 14, color: C.mute, fontWeight: '500' },
    eyebrow:           { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:          { fontFamily: F.head, fontStyle: 'italic', fontSize: 34, fontWeight: '400', color: C.ink, lineHeight: 36 },
    subline:           { fontSize: 14, color: C.mute, lineHeight: 20 },

    section:           { marginBottom: 20 },

    label:             { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 8 },
    input:             { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, fontSize: 15, color: C.ink, backgroundColor: C.card },
    inputError:        { borderColor: '#ef4444' },

    errorText:         { color: '#ef4444', fontSize: 13, marginTop: 6, fontWeight: '500' },

    primaryButton:     { backgroundColor: C.bronze, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    primaryButtonText: { fontSize: 14, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#fff' },

    buttonDisabled:    { opacity: 0.6 },
})
