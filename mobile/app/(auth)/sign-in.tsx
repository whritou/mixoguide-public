import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { loginSchema, type LoginInput } from '@mixoguide/shared'
import { useAuth } from '@/auth/useAuth'
import { getApiErrorCode, hasApiResponse } from '@/api/errors'
import { C, F } from '@/theme/brand'

function googleSignInErrorMessage(err: unknown) {
    const code = err instanceof Error ? err.message : undefined
    if (code === 'access_denied') return 'Google sign-in was cancelled.'
    if (code === 'CONFLICT') return 'This email is already registered with another provider.'
    if (code === 'NATIVE_GOOGLE_UNAVAILABLE') return 'Google sign-in is not available for this build.'
    if (code?.includes('DEVELOPER_ERROR')) {
        return 'Google sign-in is not configured for this Android build.'
    }
    if (code === 'NATIVE_GOOGLE_NO_ID_TOKEN') {
        return 'Google sign-in did not return an identity token for this build.'
    }
    return 'Unable to sign in with Google.'
}

export default function SignInScreen() {
    const insets = useSafeAreaInsets()
    const { signIn, signInWithGoogle, isLoading } = useAuth()

    const { control, handleSubmit, formState: { errors }, setError } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginInput) => {
        try {
            await signIn(data.email, data.password)
            router.replace('/(tabs)')
        } catch (err: unknown) {
            if (!hasApiResponse(err)) {
                setError('root', { message: 'Cannot reach the server. Make sure your API is running.' })
                return
            }
            const code = getApiErrorCode(err)
            if (code === 'FORBIDDEN') {
                setError('root', { message: 'Please verify your email before signing in.' })
            } else {
                setError('root', { message: 'Invalid email or password.' })
            }
        }
    }

    const onGooglePress = async () => {
        try {
            await signInWithGoogle()
            router.replace('/(tabs)')
        } catch (err) {
            setError('root', { message: googleSignInErrorMessage(err) })
        }
    }

    return (
        <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[s.header, { paddingTop: insets.top + 24 }]}>
                    <Text style={s.eyebrow}>Welcome back</Text>
                    <View style={{ height: 8 }} />
                    <Text style={s.headline}>Sign in</Text>
                </View>

                {/* Google button */}
                <View style={s.section}>
                    <TouchableOpacity
                        style={[s.googleButton, isLoading && s.buttonDisabled]}
                        onPress={onGooglePress}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={18} color={C.bronze} />
                        <Text style={s.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={s.dividerRow}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerText}>or email</Text>
                    <View style={s.dividerLine} />
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
                                editable={!isLoading}
                                placeholderTextColor={C.mute}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.email && <Text style={s.errorText}>{errors.email.message}</Text>}
                </View>

                {/* Password input */}
                <View style={s.section}>
                    <Text style={s.label}>Password</Text>
                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[s.input, errors.password && s.inputError]}
                                placeholder="••••••••"
                                secureTextEntry
                                editable={!isLoading}
                                placeholderTextColor={C.mute}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.password && <Text style={s.errorText}>{errors.password.message}</Text>}
                </View>

                {/* Root error */}
                {errors.root && (
                    <View style={s.section}>
                        <Text style={s.errorText}>{errors.root.message}</Text>
                    </View>
                )}

                {/* Sign in button */}
                <View style={s.section}>
                    <TouchableOpacity
                        style={[s.primaryButton, isLoading && s.buttonDisabled]}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        <Text style={s.primaryButtonText}>{isLoading ? 'Signing in…' : 'Sign in'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Forgot password link */}
                <View style={s.section}>
                    <TouchableOpacity onPress={() => router.push('/(auth)/request-reset')} disabled={isLoading}>
                        <Text style={s.link}>Forgot password?</Text>
                    </TouchableOpacity>
                </View>

                {/* Register link */}
                <View style={s.section}>
                    <View style={s.footer}>
                        <Text style={s.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={isLoading}>
                            <Text style={s.footerLink}>Register</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const s = StyleSheet.create({
    root:              { flex: 1, backgroundColor: C.cream },
    scroll:            { flexGrow: 1, paddingHorizontal: 24 },

    header:            { paddingBottom: 32 },
    eyebrow:           { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:          { fontFamily: F.head, fontStyle: 'italic', fontSize: 32, fontWeight: '400', color: C.ink, lineHeight: 38 },

    section:           { marginBottom: 20 },

    googleButton:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 16 },
    googleButtonText:  { fontSize: 14, fontWeight: '600', color: C.ink },

    dividerRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    dividerLine:       { flex: 1, height: 1, backgroundColor: C.border },
    dividerText:       { fontSize: 12, color: C.mute, fontWeight: '500' },

    label:             { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 8 },
    input:             { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, fontSize: 15, color: C.ink, backgroundColor: C.card },
    inputError:        { borderColor: '#ef4444' },

    errorText:         { color: '#ef4444', fontSize: 13, marginTop: 6, fontWeight: '500' },

    primaryButton:     { backgroundColor: C.bronze, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    primaryButtonText: { fontSize: 14, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#fff' },

    buttonDisabled:    { opacity: 0.6 },

    link:              { fontSize: 13, color: C.bronze, fontWeight: '600', textAlign: 'center' },

    footer:            { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText:        { fontSize: 13, color: C.mute },
    footerLink:        { fontSize: 13, color: C.bronze, fontWeight: '700' },
})
