import { useState } from 'react'
import type { ComponentProps } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCreateSuggestion } from '@/features/suggestions/hooks'
import { showGlobalNoticeDialog } from '@/components/ui/ActionDialog'
import type { SuggestionType } from '@/api/endpoints/suggestions'
import { getApiMessage } from '@/api/errors'
import { C, F } from '@/theme/brand'

type IconName = ComponentProps<typeof Ionicons>['name']

const TYPE_OPTIONS: { value: SuggestionType; label: string; icon: IconName; description: string }[] = [
    { value: 'NEW_COCKTAIL',      label: 'New cocktail',      icon: 'wine-outline',      description: 'Suggest a cocktail to add to the catalog' },
    { value: 'NEW_INGREDIENT',    label: 'New ingredient',    icon: 'leaf-outline',      description: 'Suggest a missing ingredient' },
    { value: 'MODIFY_COCKTAIL',   label: 'Fix a cocktail',    icon: 'create-outline',    description: 'Report an error or suggest a change to an existing cocktail' },
    { value: 'MODIFY_INGREDIENT', label: 'Fix an ingredient', icon: 'construct-outline', description: 'Report an error or suggest a change to an existing ingredient' },
]

export default function SuggestionsScreen() {
    const insets = useSafeAreaInsets()
    const [type, setType]         = useState<SuggestionType>('NEW_COCKTAIL')
    const [title, setTitle]       = useState('')
    const [content, setContent]   = useState('')
    const [targetName, setTargetName] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const createSuggestion = useCreateSuggestion()

    const isModify  = type === 'MODIFY_COCKTAIL' || type === 'MODIFY_INGREDIENT'
    const valid     = title.trim().length >= 3 && content.trim().length >= 10

    function handleSubmit() {
        createSuggestion.mutate(
            {
                type,
                title:      title.trim(),
                content:    content.trim(),
                targetName: isModify && targetName.trim() ? targetName.trim() : null,
            },
            {
                onSuccess: () => setSubmitted(true),
                onError: (err: unknown) => {
                    const msg = getApiMessage(err) ?? 'Could not submit suggestion.'
                    showGlobalNoticeDialog({ title: 'Error', message: msg, tone: 'danger', icon: 'close-circle-outline' })
                },
            }
        )
    }

    if (submitted) {
        return (
            <View style={[s.root, s.success, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}>
                <View style={s.successIcon}>
                    <Ionicons name="checkmark-circle-outline" size={48} color="#5a7050" />
                </View>
                <Text style={s.successTitle}>Thank you!</Text>
                <Text style={s.successSub}>Your suggestion has been submitted and will be reviewed by our team.</Text>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={17} color={C.mute} />
                    <Text style={s.backBtnText}>Back to profile</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[s.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity style={s.back} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={17} color={C.mute} />
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>Submit suggestion</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={s.divider} />

            <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Type selector */}
                <Text style={s.label}>What kind of suggestion?</Text>
                <View style={s.typeGrid}>
                    {TYPE_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[s.typeCard, type === opt.value && s.typeCardActive]}
                            onPress={() => setType(opt.value)}
                        >
                            <Ionicons name={opt.icon} size={24} color={type === opt.value ? '#f5ece0' : C.ink} />
                            <Text style={[s.typeLabel, type === opt.value && s.typeLabelActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={s.typeDesc}>{TYPE_OPTIONS.find(o => o.value === type)?.description}</Text>

                {/* Target name (for modifications) */}
                {isModify && (
                    <>
                        <Text style={[s.label, { marginTop: 20 }]}>
                            Name of the {type === 'MODIFY_COCKTAIL' ? 'cocktail' : 'ingredient'}{' '}
                            <Text style={s.optional}>(optional)</Text>
                        </Text>
                        <TextInput
                            style={s.input}
                            value={targetName}
                            onChangeText={setTargetName}
                            placeholder={`e.g. "Negroni"`}
                            placeholderTextColor={C.mute}
                            returnKeyType="next"
                            maxLength={200}
                        />
                    </>
                )}

                {/* Title */}
                <Text style={[s.label, { marginTop: 20 }]}>Title</Text>
                <TextInput
                    style={s.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Brief summary of your suggestion"
                    placeholderTextColor={C.mute}
                    returnKeyType="next"
                    maxLength={200}
                />

                {/* Content */}
                <Text style={[s.label, { marginTop: 20 }]}>Details</Text>
                <TextInput
                    style={[s.input, s.textarea]}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Describe your suggestion in detail. Include any relevant links, references, or corrections."
                    placeholderTextColor={C.mute}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={5000}
                />
                <Text style={s.charCount}>{content.length}/5000</Text>

                <TouchableOpacity
                    style={[s.cta, (!valid || createSuggestion.isPending) && s.ctaDisabled]}
                    onPress={handleSubmit}
                    disabled={!valid || createSuggestion.isPending}
                >
                    <Text style={s.ctaText}>
                        {createSuggestion.isPending ? 'Submitting…' : 'Submit suggestion'}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const s = StyleSheet.create({
    root:           { flex: 1, backgroundColor: C.cream },
    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
    title:          { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink, flex: 1, textAlign: 'center' },
    back:           { width: 60, flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText:       { fontSize: 15, color: C.mute, fontWeight: '500' },
    divider:        { height: 1, backgroundColor: C.border },
    body:           { padding: 20 },

    label:          { fontSize: 9, fontWeight: '600', color: C.mute, textTransform: 'uppercase', letterSpacing: 2.2, marginBottom: 10 },
    optional:       { fontWeight: '400', textTransform: 'none', letterSpacing: 0 },

    typeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    typeCard:       { width: '47%', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, backgroundColor: C.card },
    typeCardActive: { borderColor: C.bronze, backgroundColor: C.bronze },
    typeLabel:      { fontSize: 13, fontWeight: '600', color: C.ink, textAlign: 'center' },
    typeLabelActive:{ color: '#f5ece0' },
    typeDesc:       { fontSize: 13, color: C.mute, lineHeight: 18, marginBottom: 4 },

    input:          { backgroundColor: C.card, borderRadius: 12, padding: 14, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: C.border },
    textarea:       { minHeight: 120, paddingTop: 14 },
    charCount:      { fontSize: 11, color: C.mute, textAlign: 'right', marginTop: 4, marginBottom: 8 },

    cta:            { backgroundColor: C.bronze, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    ctaDisabled:    { opacity: 0.4 },
    ctaText:        { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#f5ece0' },

    success:        { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
    successIcon:    { width: 90, height: 90, borderRadius: 28, backgroundColor: '#e8ece0', alignItems: 'center', justifyContent: 'center' },
    successTitle:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 28, fontWeight: '400', color: C.ink },
    successSub:     { fontSize: 15, color: C.mute, textAlign: 'center', lineHeight: 22 },
    backBtn:        { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
    backBtnText:    { fontSize: 15, color: C.mute, fontWeight: '500' },
})
