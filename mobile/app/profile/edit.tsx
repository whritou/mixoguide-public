import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useProfile, useUpdateProfile } from '@/features/profile/hooks'
import { showGlobalNoticeDialog } from '@/components/ui/ActionDialog'
import { C, F } from '@/theme/brand'

export default function EditProfileScreen() {
    const insets = useSafeAreaInsets()
    const { data: profile } = useProfile()
    const [name, setName]   = useState(profile?.name ?? '')
    const updateProfile     = useUpdateProfile()

    function handleSave() {
        const trimmed = name.trim()
        if (trimmed.length < 2) {
            showGlobalNoticeDialog({ title: 'Validation', message: 'Name must be at least 2 characters.', icon: 'information-circle-outline' })
            return
        }
        updateProfile.mutate(
            { name: trimmed },
            {
                onSuccess: () => router.back(),
                onError: () => showGlobalNoticeDialog({ title: 'Error', message: 'Could not update profile. Please try again.', tone: 'danger', icon: 'close-circle-outline' }),
            }
        )
    }

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={s.cancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={s.title}>Edit profile</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={updateProfile.isPending || name.trim().length < 2}
                >
                    <Text style={[s.save, (updateProfile.isPending || name.trim().length < 2) && s.saveDisabled]}>
                        {updateProfile.isPending ? 'Saving…' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={s.divider} />

            <View style={s.body}>
                <Text style={s.label}>Display name</Text>
                <TextInput
                    style={s.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={C.mute}
                    autoFocus
                    maxLength={100}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                />
            </View>
        </View>
    )
}

const s = StyleSheet.create({
    root:        { flex: 1, backgroundColor: C.cream },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    title:       { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink },
    cancel:      { fontSize: 15, color: C.mute, fontWeight: '500' },
    save:        { fontSize: 15, fontWeight: '700', color: C.bronze },
    saveDisabled:{ color: C.border },
    divider:     { height: 1, backgroundColor: C.border },
    body:        { padding: 24, gap: 8 },
    label:       { fontSize: 9, fontWeight: '600', color: C.mute, textTransform: 'uppercase', letterSpacing: 2.2 },
    input:       { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 16, color: C.ink, marginTop: 8 },
    hint:        { fontSize: 13, color: C.mute, lineHeight: 18, marginTop: 4 },
})
