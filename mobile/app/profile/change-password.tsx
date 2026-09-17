import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useChangePassword, useDeleteAccount } from '@/features/profile/hooks'
import { useAuth } from '@/auth/useAuth'
import { getApiMessage } from '@/api/errors'
import { showGlobalNoticeDialog, useActionDialog } from '@/components/ui/ActionDialog'
import { C, F } from '@/theme/brand'

export default function ChangePasswordScreen() {
    const insets              = useSafeAreaInsets()
    const { mode }            = useLocalSearchParams<{ mode?: string }>()
    const isDeleteMode        = mode === 'delete'

    const [current, setCurrent]   = useState('')
    const [next, setNext]         = useState('')
    const [confirm, setConfirm]   = useState('')

    const changePassword  = useChangePassword()
    const deleteAccount   = useDeleteAccount()
    const { signOut }     = useAuth()
    const { openActionDialog, actionDialog } = useActionDialog()

    const title = isDeleteMode ? 'Confirm deletion' : 'Change password'
    const ctaLabel = isDeleteMode
        ? (deleteAccount.isPending ? 'Deleting…' : 'Delete account')
        : (changePassword.isPending ? 'Saving…' : 'Update password')

    const valid = isDeleteMode
        ? current.length > 0
        : current.length > 0 && next.length >= 8 && next === confirm

    function handleSubmit() {
        if (isDeleteMode) {
            openActionDialog({
                title:        'Are you sure?',
                message:      'Your account will be permanently deleted.',
                confirmLabel: 'Delete',
                tone:         'danger',
                onConfirm:    () =>
                    deleteAccount.mutate(current, {
                        onSuccess: () => signOut(),
                        onError:   () => showGlobalNoticeDialog({ title: 'Error', message: 'Incorrect password or server error.', tone: 'danger', icon: 'close-circle-outline' }),
                    }),
            })
            return
        }

        changePassword.mutate(
            { currentPassword: current, newPassword: next, confirmPassword: confirm },
            {
                onSuccess: () => {
                    showGlobalNoticeDialog({ title: 'Done', message: 'Password updated successfully.', tone: 'success', icon: 'checkmark-circle-outline' })
                    router.back()
                },
                onError: (err: unknown) => {
                    const msg = getApiMessage(err) ?? 'Could not update password.'
                    showGlobalNoticeDialog({ title: 'Error', message: msg, tone: 'danger', icon: 'close-circle-outline' })
                },
            }
        )
    }

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            <View style={s.header}>
                <TouchableOpacity style={s.back} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={17} color={C.mute} />
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>{title}</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={s.divider} />

            <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
                <Field
                    label="Current password"
                    value={current}
                    onChange={setCurrent}
                    placeholder="Enter current password"
                    autoFocus
                />

                {!isDeleteMode && (
                    <>
                        <Field
                            label="New password"
                            value={next}
                            onChange={setNext}
                            placeholder="At least 8 characters"
                        />
                        <Field
                            label="Confirm new password"
                            value={confirm}
                            onChange={setConfirm}
                            placeholder="Repeat new password"
                            error={confirm.length > 0 && next !== confirm ? 'Passwords do not match' : undefined}
                        />
                    </>
                )}

                <TouchableOpacity
                    style={[
                        s.cta,
                        isDeleteMode && s.ctaDanger,
                        (!valid || changePassword.isPending || deleteAccount.isPending) && s.ctaDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!valid || changePassword.isPending || deleteAccount.isPending}
                >
                    <Text style={s.ctaText}>{ctaLabel}</Text>
                </TouchableOpacity>
            </ScrollView>
            {actionDialog}
        </View>
    )
}

function Field({
    label, value, onChange, placeholder, autoFocus, error,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder: string
    autoFocus?: boolean
    error?: string
}) {
    return (
        <View style={f.wrap}>
            <Text style={f.label}>{label}</Text>
            <TextInput
                style={[f.input, !!error && f.inputError]}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={C.mute}
                secureTextEntry
                autoFocus={autoFocus}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
            />
            {error && <Text style={f.error}>{error}</Text>}
        </View>
    )
}

const s = StyleSheet.create({
    root:       { flex: 1, backgroundColor: C.cream },
    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    title:      { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink, flex: 1, textAlign: 'center' },
    back:       { width: 60, flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText:   { fontSize: 15, color: C.mute, fontWeight: '500' },
    divider:    { height: 1, backgroundColor: C.border },
    body:       { padding: 24 },
    cta:        { backgroundColor: C.bronze, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    ctaDanger:  { backgroundColor: '#ef4444' },
    ctaDisabled:{ opacity: 0.4 },
    ctaText:    { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#f5ece0' },
})

const f = StyleSheet.create({
    wrap:       { marginBottom: 20 },
    label:      { fontSize: 9, fontWeight: '600', color: C.mute, textTransform: 'uppercase', letterSpacing: 2.2, marginBottom: 8 },
    input:      { backgroundColor: C.card, borderRadius: 12, padding: 14, fontSize: 16, color: C.ink, borderWidth: 1, borderColor: C.border },
    inputError: { borderColor: '#ef4444' },
    error:      { fontSize: 12, color: '#ef4444', marginTop: 4 },
})
