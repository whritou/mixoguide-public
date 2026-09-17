import { useQuery } from '@tanstack/react-query'
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { keys } from '@/lib/query-keys'
import { smartCollectionsApi, type SmartCollection } from '@/api/endpoints/smart-collections'
import type { CreateCollectionInitialValues } from './CreateCollectionSheet'
import { C, F } from '@/theme/brand'

const ICON_NAME: Record<SmartCollection['icon'], keyof typeof Ionicons.glyphMap> = {
    sparkles:  'sparkles-outline',
    heart:     'heart-outline',
    sun:       'sunny-outline',
    snowflake: 'snow-outline',
    coffee:    'cafe-outline',
    leaf:      'leaf-outline',
    moon:      'moon-outline',
    flame:     'flame-outline',
}

const ACCENT_BG: Record<SmartCollection['accent'], string> = {
    caramel: '#f5e4d0',
    brown:   '#e9d8c4',
    amber:   '#f2e6c8',
    ink:     '#e0dcd6',
    rose:    '#f4dad0',
    sage:    '#dceadb',
}

const ACCENT_INK: Record<SmartCollection['accent'], string> = {
    caramel: '#7a5830',
    brown:   '#4f3b22',
    amber:   '#8a6a25',
    ink:     '#1b1c1a',
    rose:    '#94503e',
    sage:    '#3f6a44',
}

function isoFromOffset(offset: number): string {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    d.setHours(19, 0, 0, 0)
    return d.toISOString()
}

interface Props {
    title?: string
    /** Open the create-collection sheet pre-filled with the theme. */
    onOpenTheme: (config: CreateCollectionInitialValues) => void
}

export function SmartCollectionsRow({ title = 'Smart collections', onOpenTheme }: Props) {
    const { data, isLoading } = useQuery({
        queryKey:  keys.smartCollections.list,
        queryFn:   () => smartCollectionsApi.list().then(r => r.data.data),
        staleTime: 5 * 60 * 1000,
    })

    const themes = (data ?? []).filter(t => t.cocktails.length > 0)

    if (isLoading) {
        return (
            <View style={s.section}>
                <Text style={s.eyebrow}>Smart collections</Text>
                <View style={[s.loader, { paddingVertical: 16 }]}>
                    <ActivityIndicator color={C.bronze} />
                </View>
            </View>
        )
    }

    if (themes.length === 0) return null

    return (
        <View style={s.section}>
            <View style={s.header}>
                <Ionicons name="color-wand-outline" size={12} color={C.bronze} />
                <Text style={s.eyebrow}>{title}</Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.scroll}
            >
                {themes.map(theme => {
                    const accentBg  = ACCENT_BG[theme.accent]
                    const accentInk = ACCENT_INK[theme.accent]
                    return (
                        <TouchableOpacity
                            key={theme.slug}
                            activeOpacity={0.85}
                            style={[s.card, { backgroundColor: accentBg }]}
                            onPress={() => onOpenTheme({
                                title:       theme.title,
                                plannedFor:  isoFromOffset(theme.defaultDayOffset),
                                servings:    theme.defaultServings,
                                occasions:   theme.occasions,
                                cocktailIds: theme.cocktails.map(c => c.id),
                            })}
                        >
                            <View style={[s.iconCircle, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
                                <Ionicons name={ICON_NAME[theme.icon]} size={16} color={accentInk} />
                            </View>
                            <Text style={[s.title, { color: accentInk }]} numberOfLines={1}>{theme.title}</Text>
                            <Text style={s.sub} numberOfLines={2}>{theme.subtitle}</Text>

                            <View style={s.avatarRow}>
                                {theme.cocktails.slice(0, 4).map((c, idx) => (
                                    <View
                                        key={c.id}
                                        style={[s.avatar, { marginLeft: idx === 0 ? 0 : -8 }]}
                                    >
                                        {c.imageUrl ? (
                                            <Image source={{ uri: c.imageUrl }} style={s.avatarImg} />
                                        ) : (
                                            <Text style={[s.avatarLetter, { color: accentInk }]}>{c.name.charAt(0)}</Text>
                                        )}
                                    </View>
                                ))}
                                {theme.cocktailCount > 4 && (
                                    <View style={[s.avatar, s.avatarMore, { marginLeft: -8 }]}>
                                        <Text style={s.avatarMoreText}>+{theme.cocktailCount - 4}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>
        </View>
    )
}

const s = StyleSheet.create({
    section: { marginTop: 18 },
    header:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 16 },
    eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.bronze },
    loader:  { alignItems: 'center', justifyContent: 'center' },

    scroll:  { paddingHorizontal: 16, gap: 10 },
    card:    {
        width: 200, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    },
    iconCircle: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, marginTop: 10 },
    sub:   { fontSize: 11, color: 'rgba(27,28,26,0.65)', marginTop: 4, lineHeight: 15, minHeight: 30 },

    avatarRow: { flexDirection: 'row', marginTop: 12 },
    avatar:    {
        width: 26, height: 26, borderRadius: 13,
        borderWidth: 2, borderColor: '#fff',
        backgroundColor: 'rgba(255,255,255,0.65)',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg:      { width: '100%', height: '100%' },
    avatarLetter:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 11 },
    avatarMore:     { backgroundColor: 'rgba(255,255,255,0.85)' },
    avatarMoreText: { fontSize: 9, fontWeight: '500', color: C.mute },
})
