import { useState, type ReactNode } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Linking,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { z } from 'zod'
import { registerSchema } from '@mixoguide/shared'
import { authApi } from '@/api/endpoints/auth'
import { getApiErrorCode, getApiStatus } from '@/api/errors'
import { useAuth } from '@/auth/useAuth'
import { C, F } from '@/theme/brand'

const LEGAL_AGE_MESSAGE = 'You must confirm you are of legal drinking age.'
const TERMS_MESSAGE = 'You must agree to the Terms of Use and Privacy Policy.'

const mobileRegisterSchema = registerSchema.extend({
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    passwordConfirm: z.string().min(1, 'Please confirm your password').max(100),
    legalAgeConfirmed: z.boolean().refine(Boolean, { message: LEGAL_AGE_MESSAGE }),
    termsAccepted: z.boolean().refine(Boolean, { message: TERMS_MESSAGE }),
}).refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
})

type RegisterInput = z.infer<typeof mobileRegisterSchema>

function googleSignInErrorMessage(err: unknown) {
    const code = err instanceof Error ? err.message : undefined
    if (code === 'access_denied') return 'Google sign-in was cancelled.'
    if (code === 'CONFLICT' || getApiErrorCode(err) === 'CONFLICT') {
        return 'This email is already registered with another provider.'
    }
    if (code === 'NATIVE_GOOGLE_UNAVAILABLE') return 'Google sign-in is not available for this build.'
    if (code?.includes('DEVELOPER_ERROR')) {
        return 'Google sign-in is not configured for this Android build.'
    }
    if (code === 'NATIVE_GOOGLE_NO_ID_TOKEN') {
        return 'Google sign-in did not return an identity token for this build.'
    }
    return 'Unable to sign in with Google.'
}

function goToVerifyEmail(email: string, reason?: 'created' | 'existing') {
    router.replace({
        pathname: '/(auth)/check-email',
        params: { type: 'verify', email, reason },
    })
}

export default function RegisterScreen() {
    const insets = useSafeAreaInsets()
    const { signInWithGoogle, isLoading } = useAuth()
    const [showPassword, setShowPassword] = useState(false)
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
        watch,
    } = useForm<RegisterInput>({
        resolver: zodResolver(mobileRegisterSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            passwordConfirm: '',
            legalAgeConfirmed: false,
            termsAccepted: false,
        },
    })

    const legalAgeConfirmed = watch('legalAgeConfirmed')
    const termsAccepted = watch('termsAccepted')
    const isBusy = isSubmitting || isLoading

    const onSubmit = async (data: RegisterInput) => {
        try {
            await authApi.register(data.email, data.name ?? '', data.password)
            goToVerifyEmail(data.email, 'created')
        } catch (err: unknown) {
            if (getApiStatus(err) === 409 || getApiErrorCode(err) === 'CONFLICT') {
                goToVerifyEmail(data.email, 'existing')
                return
            }
            setError('root', { message: 'Registration failed. Please try again.' })
        }
    }

    const onGooglePress = async () => {
        clearErrors('root')

        if (!legalAgeConfirmed || !termsAccepted) {
            if (!legalAgeConfirmed) {
                setError('legalAgeConfirmed', { type: 'manual', message: LEGAL_AGE_MESSAGE })
            }
            if (!termsAccepted) {
                setError('termsAccepted', { type: 'manual', message: TERMS_MESSAGE })
            }
            return
        }

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
                <View style={[s.header, { paddingTop: insets.top + 24 }]}>
                    <Text style={s.eyebrow}>Join the collection</Text>
                    <View style={{ height: 8 }} />
                    <Text style={s.headline}>Create account</Text>
                    <View style={{ height: 6 }} />
                    <Text style={s.subline}>Sign up to start mixing and collecting cocktails</Text>
                </View>

                <View style={s.section}>
                    <Controller
                        control={control}
                        name="legalAgeConfirmed"
                        render={({ field: { onChange, value } }) => (
                            <CheckRow
                                checked={value}
                                disabled={isBusy}
                                onPress={() => {
                                    onChange(!value)
                                    clearErrors('legalAgeConfirmed')
                                }}
                                label="I confirm that I am at least 18 years old and of legal drinking age in my country or region."
                                error={errors.legalAgeConfirmed?.message}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name="termsAccepted"
                        render={({ field: { onChange, value } }) => (
                            <CheckRow
                                checked={value}
                                disabled={isBusy}
                                onPress={() => {
                                    onChange(!value)
                                    clearErrors('termsAccepted')
                                }}
                                error={errors.termsAccepted?.message}
                            >
                                <Text style={s.checkLabel}>
                                    I agree to the{' '}
                                    <Text style={s.inlineLink} onPress={() => Linking.openURL('https://mixoguide.com/terms-of-use')}>
                                        Terms of Use
                                    </Text>
                                    {' '}and{' '}
                                    <Text style={s.inlineLink} onPress={() => Linking.openURL('https://mixoguide.com/privacy-policy')}>
                                        Privacy Policy
                                    </Text>
                                    .
                                </Text>
                            </CheckRow>
                        )}
                    />
                </View>

                <View style={s.section}>
                    <TouchableOpacity
                        style={[s.googleButton, isBusy && s.buttonDisabled]}
                        onPress={onGooglePress}
                        disabled={isBusy}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={18} color={C.bronze} />
                        <Text style={s.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>

                <View style={s.dividerRow}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerText}>or email</Text>
                    <View style={s.dividerLine} />
                </View>

                <View style={s.section}>
                    <Text style={s.label}>Name</Text>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[s.input, errors.name && s.inputError]}
                                placeholder="Your name"
                                autoCapitalize="words"
                                editable={!isBusy}
                                placeholderTextColor={C.mute}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value ?? ''}
                            />
                        )}
                    />
                    {errors.name && <Text style={s.errorText}>{errors.name.message}</Text>}
                </View>

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
                                editable={!isBusy}
                                placeholderTextColor={C.mute}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />
                    {errors.email && <Text style={s.errorText}>{errors.email.message}</Text>}
                </View>

                <View style={s.section}>
                    <Text style={s.label}>Password</Text>
                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={[s.passwordWrap, errors.password && s.inputError]}>
                                <TextInput
                                    style={s.passwordInput}
                                    placeholder="At least 8 characters"
                                    secureTextEntry={!showPassword}
                                    editable={!isBusy}
                                    placeholderTextColor={C.mute}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                />
                                <TouchableOpacity
                                    style={s.eyeButton}
                                    onPress={() => setShowPassword((value) => !value)}
                                    disabled={isBusy}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.mute} />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                    {errors.password && <Text style={s.errorText}>{errors.password.message}</Text>}
                </View>

                <View style={s.section}>
                    <Text style={s.label}>Confirm password</Text>
                    <Controller
                        control={control}
                        name="passwordConfirm"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={[s.passwordWrap, errors.passwordConfirm && s.inputError]}>
                                <TextInput
                                    style={s.passwordInput}
                                    placeholder="Repeat your password"
                                    secureTextEntry={!showPasswordConfirm}
                                    editable={!isBusy}
                                    placeholderTextColor={C.mute}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                />
                                <TouchableOpacity
                                    style={s.eyeButton}
                                    onPress={() => setShowPasswordConfirm((value) => !value)}
                                    disabled={isBusy}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPasswordConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
                                >
                                    <Ionicons name={showPasswordConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.mute} />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                    {errors.passwordConfirm && <Text style={s.errorText}>{errors.passwordConfirm.message}</Text>}
                </View>

                {errors.root && (
                    <View style={s.section}>
                        <Text style={s.errorText}>{errors.root.message}</Text>
                    </View>
                )}

                <View style={s.section}>
                    <TouchableOpacity
                        style={[s.primaryButton, isBusy && s.buttonDisabled]}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isBusy}
                        activeOpacity={0.8}
                    >
                        <Text style={s.primaryButtonText}>{isBusy ? 'Creating account...' : 'Create account'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={s.section}>
                    <View style={s.footer}>
                        <Text style={s.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.back()} disabled={isBusy}>
                            <Text style={s.footerLink}>Sign in</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

function CheckRow({
    checked,
    children,
    disabled,
    error,
    label,
    onPress,
}: {
    checked: boolean
    children?: ReactNode
    disabled: boolean
    error?: string
    label?: string
    onPress: () => void
}) {
    return (
        <View style={s.checkWrap}>
            <TouchableOpacity
                style={s.checkRow}
                onPress={onPress}
                disabled={disabled}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled }}
                activeOpacity={0.8}
            >
                <View style={[s.checkbox, checked && s.checkboxChecked]}>
                    {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                {children ?? <Text style={s.checkLabel}>{label}</Text>}
            </TouchableOpacity>
            {error && <Text style={s.errorText}>{error}</Text>}
        </View>
    )
}

const s = StyleSheet.create({
    root:              { flex: 1, backgroundColor: C.cream },
    scroll:            { flexGrow: 1, paddingHorizontal: 24 },

    header:            { paddingBottom: 32 },
    eyebrow:           { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:          { fontFamily: F.head, fontStyle: 'italic', fontSize: 34, fontWeight: '400', color: C.ink, lineHeight: 36 },
    subline:           { fontSize: 14, color: C.mute, lineHeight: 20 },

    section:           { marginBottom: 20 },

    checkWrap:         { marginBottom: 12 },
    checkRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    checkbox:          { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkboxChecked:   { backgroundColor: C.bronze, borderColor: C.bronze },
    checkLabel:        { flex: 1, fontSize: 12, color: C.mute, lineHeight: 18 },
    inlineLink:        { color: C.bronze, fontWeight: '700' },

    googleButton:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 16 },
    googleButtonText:  { fontSize: 14, fontWeight: '600', color: C.ink },

    dividerRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    dividerLine:       { flex: 1, height: 1, backgroundColor: C.border },
    dividerText:       { fontSize: 12, color: C.mute, fontWeight: '500' },

    label:             { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 8 },
    input:             { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, fontSize: 15, color: C.ink, backgroundColor: C.card },
    passwordWrap:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.card },
    passwordInput:     { flex: 1, paddingVertical: 14, paddingHorizontal: 14, fontSize: 15, color: C.ink },
    eyeButton:         { width: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
    inputError:        { borderColor: '#ef4444' },

    errorText:         { color: '#ef4444', fontSize: 13, marginTop: 6, fontWeight: '500' },

    primaryButton:     { backgroundColor: C.bronze, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    primaryButtonText: { fontSize: 14, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#fff' },

    buttonDisabled:    { opacity: 0.6 },

    footer:            { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText:        { fontSize: 13, color: C.mute },
    footerLink:        { fontSize: 13, color: C.bronze, fontWeight: '700' },
})
