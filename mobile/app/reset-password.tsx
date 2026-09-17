import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { router, useLocalSearchParams } from 'expo-router'
import { z } from 'zod'
import { resetPasswordSchema } from '@mixoguide/shared'
import { authApi } from '@/api/endpoints/auth'
import { C } from '@/theme/brand'

type ResetInput = z.infer<typeof resetPasswordSchema>

const RESET_TOKEN_FORMAT = /^[A-Za-z0-9_-]{32,256}$/

export default function ResetPasswordScreen() {
    const params = useLocalSearchParams<{ token?: string }>()
    const [token, setToken] = useState<string | null>(() => {
        const raw = typeof params.token === 'string' ? params.token : null
        return raw && RESET_TOKEN_FORMAT.test(raw) ? raw : null
    })
    const tokenInvalid = !token

    const { control, handleSubmit, formState: { errors, isSubmitting }, setError, reset } = useForm<ResetInput>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { token: token ?? '', password: '', passwordConfirm: '' },
    })

    useEffect(() => {
        if (typeof params.token === 'string' && params.token.length > 0) {
            router.setParams({ token: '' })
        }
    }, [params.token])

    const onSubmit = async (data: ResetInput) => {
        const submissionToken = data.token
        try {
            setToken(null)
            reset({ token: '', password: '', passwordConfirm: '' })
            await authApi.resetPassword(submissionToken, data.password, data.passwordConfirm)
            router.replace('/(auth)/sign-in')
        } catch (err: unknown) {
            const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code
            if (code === 'BAD_REQUEST') {
                setError('root', { message: 'This reset link has expired or already been used. Please request a new one.' })
            } else {
                setError('root', { message: 'Something went wrong. Please try again.' })
            }
        }
    }

    if (tokenInvalid) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Invalid link</Text>
                <Text style={styles.subtitle}>This reset link is missing or malformed. Please request a new one.</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/request-reset')}>
                    <Text style={styles.buttonText}>Request new link</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={styles.title}>Set new password</Text>
            <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

            <Text style={styles.label}>New password</Text>
            <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.password && styles.inputError]}
                        placeholder="At least 8 characters"
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />
                )}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

            <Text style={styles.label}>Confirm password</Text>
            <Controller
                control={control}
                name="passwordConfirm"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={[styles.input, errors.passwordConfirm && styles.inputError]}
                        placeholder="Repeat your password"
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />
                )}
            />
            {errors.passwordConfirm && <Text style={styles.errorText}>{errors.passwordConfirm.message}</Text>}
            {errors.root && <Text style={styles.errorText}>{errors.root.message}</Text>}

            <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
            >
                <Text style={styles.buttonText}>{isSubmitting ? 'Saving…' : 'Set new password'}</Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 22 },
    label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 4 },
    inputError: { borderColor: '#ef4444' },
    errorText: { color: '#ef4444', fontSize: 13, marginBottom: 10 },
    button: { backgroundColor: C.bronze, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
