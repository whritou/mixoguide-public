import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/useAuth'
import { useProfile, useDeleteAccount } from '@/features/profile/hooks'
import { Skeleton } from '@/components/ui/Skeleton'
import { showGlobalNoticeDialog, useActionDialog } from '@/components/ui/ActionDialog'
import { useFloatingTabBarLayout } from '@/components/navigation/FloatingTabBarLayoutContext'
import { C, F } from '@/theme/brand'
import { Image } from 'expo-image'
import { isBiometricAvailable } from '@/auth/biometric'
import { getBiometricEnabled, setBiometricEnabled } from '@/auth/tokenStore'
import { useProductTour } from '@/onboarding/ProductTour'

type IconName = ComponentProps<typeof Ionicons>['name']
const INSTAGRAM_URL = 'https://www.instagram.com/mixoguide/'

export default function ProfileScreen() {
    const insets        = useSafeAreaInsets()
    const { user, signOut } = useAuth()
    const tour = useProductTour()
    const { data: profile, isLoading } = useProfile()
    const deleteAccount = useDeleteAccount()
    const { openActionDialog, actionDialog } = useActionDialog()
    const { getScrollPadding } = useFloatingTabBarLayout(insets.bottom)
    const tabScrollPadding = getScrollPadding()

    const [biometricAvailable, setBiometricAvailable] = useState(false)
    const [biometricEnabled, _setBiometricEnabled]    = useState(false)

    useEffect(() => {
        async function loadBiometric() {
            const available = await isBiometricAvailable()
            if (!available) return
            setBiometricAvailable(true)
            _setBiometricEnabled(await getBiometricEnabled())
        }
        loadBiometric()
    }, [])

    async function handleBiometricToggle(value: boolean) {
        _setBiometricEnabled(value)
        await setBiometricEnabled(value)
    }

    const initials = (profile?.name ?? user?.name ?? '?')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const made      = profile?.stats.madeLogs ?? 0
    const favorites = profile?.stats.favoriteCocktails ?? profile?.stats.favoritedCocktails ?? 0
    const pantry    = profile?.stats.pantryItems ?? 0

    function handleSignOut() {
        openActionDialog({
            title:        'Sign out',
            message:      'Are you sure you want to sign out?',
            confirmLabel: 'Sign out',
            tone:         'danger',
            icon:         'log-out-outline',
            onConfirm:    () => signOut(),
        })
    }

    function handleDeleteAccount() {
        openActionDialog({
            title:        'Delete account',
            message:      'This will permanently delete your account and all your data. This cannot be undone.',
            confirmLabel: 'Delete',
            tone:         'danger',
            onConfirm:    () => {
                if (profile?.hasPassword) {
                    router.push('/profile/change-password?mode=delete')
                    return
                }
                openActionDialog({
                    title:        'Confirm deletion',
                    message:      'Tap Delete to permanently remove your account.',
                    confirmLabel: 'Delete',
                    tone:         'danger',
                    onConfirm:    () => deleteAccount.mutate(undefined, {
                        onSuccess: () => signOut(),
                        onError:   () => showGlobalNoticeDialog({ title: 'Error', message: 'Could not delete account.', tone: 'danger', icon: 'close-circle-outline' }),
                    }),
                })
            },
        })
    }

    function handleInstagramPress() {
        Linking.openURL(INSTAGRAM_URL).catch(() => {
            showGlobalNoticeDialog({ title: 'Instagram', message: 'Could not open Instagram right now.', icon: 'logo-instagram' })
        })
    }

    return (
        <ScrollView
            style={s.root}
            contentContainerStyle={[s.scroll, { paddingTop: insets.top + 14, paddingBottom: tabScrollPadding }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header row */}
            <View style={s.headerRow}>
                <View>
                    <Text style={s.eyebrow}>Your account</Text>
                    <Text style={s.headline}>Profile</Text>
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => router.push('/profile/edit')}>
                    <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
            </View>

            {/* Avatar card */}
            <View style={s.avatarCard}>
                <View style={s.avatarCircle}>
                    {user?.image ? (
                        <Image
                            source={{ uri: user.image }}
                            style={s.avatarImage}
                            accessibilityRole="image"
                            accessibilityLabel={`${profile?.name ?? user.name ?? 'User'} profile image`}
                            contentFit="cover"
                        />
                    ) : (
                        <Text style={s.avatarText}>{initials}</Text>
                    )}
                </View>
                {isLoading ? (
                    <View style={{ alignItems: 'center', gap: 8, marginTop: 12 }}>
                        <Skeleton height={20} width={140} borderRadius={6} />
                        <Skeleton height={13} width={180} borderRadius={6} />
                    </View>
                ) : (
                    <>
                        <Text style={s.name}>{profile?.name ?? user?.name ?? '—'}</Text>
                        <Text style={s.email}>{profile?.email ?? user?.email ?? '—'}</Text>
                        {profile?.createdAt && (
                            <Text style={s.since}>
                                Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </Text>
                        )}
                    </>
                )}

                {/* Stats row */}
                <View style={s.statsRow}>
                    <StatCell value={made}      label="Made"      />
                    <View style={s.statDivider} />
                    <StatCell value={favorites} label="Favorites" />
                    <View style={s.statDivider} />
                    <StatCell value={pantry}    label="Pantry"    />
                </View>
            </View>

            {/* Library group */}
            <MenuGroup label="Library">
                <MenuItem icon="wine-outline" label="Browse cocktails" onPress={() => router.push('/(tabs)/cocktails')} />
                <MenuItem icon="file-tray-stacked-outline" label="My pantry" onPress={() => router.push('/(tabs)/pantry')} />
                <MenuItem icon="calendar-outline" label="My planner" onPress={() => router.push('/(tabs)/planner')} />
                <MenuItem icon="bar-chart-outline" label="My activity" onPress={() => router.push('/profile/stats')} />
            </MenuGroup>

            {/* Preferences group */}
            <MenuGroup label="Preferences">
                <MenuItem icon="map-outline" label="Replay onboarding tour" onPress={tour.restart} />
                <MenuItem icon="bulb-outline" label="Submit a suggestion" onPress={() => router.push('/profile/suggestions')} />
                {profile?.hasPassword && (
                    <MenuItem icon="key-outline" label="Change password" onPress={() => router.push('/profile/change-password')} />
                )}
                {biometricAvailable && (
                    <ToggleMenuItem
                        icon="finger-print-outline"
                        label="Require biometric to open"
                        value={biometricEnabled}
                        onValueChange={handleBiometricToggle}
                    />
                )}
            </MenuGroup>

            <MenuGroup label="Community">
                <MenuItem icon="logo-instagram" label="Follow @mixoguide" onPress={handleInstagramPress} />
            </MenuGroup>

            {/* Account group */}
            <MenuGroup label="Account">
                <MenuItem icon="log-out-outline" label="Sign out" onPress={handleSignOut} danger />
                <MenuItem icon="trash-outline" label="Delete account" onPress={handleDeleteAccount} danger />
            </MenuGroup>

            <Text style={s.version}>MixoGuide · v1.1.2</Text>
            {actionDialog}
        </ScrollView>
    )
}

function StatCell({ value, label }: { value: number; label: string }) {
    return (
        <View style={s.statCell}>
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    )
}

function MenuGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={mg.wrap}>
            <Text style={mg.label}>{label}</Text>
            <View style={mg.card}>{children}</View>
        </View>
    )
}

function MenuItem({
    icon, label, onPress, danger = false, isLast = false,
}: { icon: IconName; label: string; onPress: () => void; danger?: boolean; isLast?: boolean }) {
    return (
        <TouchableOpacity style={[mi.row, !isLast && mi.rowBorder]} onPress={onPress} activeOpacity={0.7}>
            <View style={mi.iconCircle}>
                <Ionicons name={icon} size={17} color={danger ? '#ef4444' : C.bronze} />
            </View>
            <Text style={[mi.label, danger && mi.labelDanger]}>{label}</Text>
            <Ionicons name="chevron-forward" size={22} color={C.mute} />
        </TouchableOpacity>
    )
}

function ToggleMenuItem({
    icon, label, value, onValueChange,
}: { icon: IconName; label: string; value: boolean; onValueChange: (v: boolean) => void }) {
    return (
        <View style={[mi.row, mi.rowBorder]}>
            <View style={mi.iconCircle}>
                <Ionicons name={icon} size={17} color={C.bronze} />
            </View>
            <Text style={mi.label}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: C.border, true: C.bronze }}
                thumbColor="#fff"
            />
        </View>
    )
}

const s = StyleSheet.create({
    root:        { flex: 1, backgroundColor: C.cream },
    scroll:      { paddingHorizontal: 20 },

    headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
    eyebrow:     { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze, marginBottom: 6 },
    headline:    { fontFamily: F.head, fontStyle: 'italic', fontSize: 30, fontWeight: '400', color: C.ink, lineHeight: 32 },
    editBtn:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
    editBtnText: { fontSize: 12, fontWeight: '600', color: C.ink },

    avatarCard:   { backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center', marginBottom: 24 },
    avatarCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: C.bronze, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    avatarImage: { width: '100%', height: '100%', borderRadius: 42 },
    avatarText:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 30, color: '#fff' },
    name:         { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, fontWeight: '400', color: C.ink, marginBottom: 4 },
    email:        { fontSize: 13, color: C.mute, marginBottom: 2 },
    since:        { fontSize: 11, color: C.mute, marginTop: 4 },

    statsRow:    { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: C.border },
    statCell:    { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: C.border },
    statValue:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 24, color: C.bronze, lineHeight: 26 },
    statLabel:   { fontSize: 9, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: C.mute, marginTop: 4 },

    version:     { textAlign: 'center', fontFamily: F.mono, fontSize: 11, color: C.bronze, marginTop: 20 },
})

const mg = StyleSheet.create({
    wrap:  { marginBottom: 20 },
    label: { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.mute, marginBottom: 10, marginLeft: 4 },
    card:  { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
})

const mi = StyleSheet.create({
    row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    rowBorder:      { borderBottomWidth: 1, borderBottomColor: C.border },
    iconCircle:     { width: 36, height: 36, borderRadius: 12, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    label:          { flex: 1, fontSize: 15, color: C.ink },
    labelDanger:    { color: '#ef4444' },
})
