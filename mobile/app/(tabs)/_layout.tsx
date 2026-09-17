import { useState, type ComponentProps } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Tabs } from 'expo-router'
import { type BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '@/theme/brand'
import { AdBanner } from '@/components/ads/AdBanner'
import {
    FLOATING_TAB_BAR_BOTTOM_MIN,
    FLOATING_TAB_BAR_HEIGHT,
    FLOATING_TAB_BAR_TOP_PADDING,
} from '@/components/navigation/floatingTabBarMetrics'
import {
    FloatingTabBarLayoutProvider,
    useReportFloatingTabAdSlot,
} from '@/components/navigation/FloatingTabBarLayoutContext'

type IconName = ComponentProps<typeof Ionicons>['name']

type TabConfig = { name: string; title: string; icon: IconName; activeIcon: IconName }

const TABS: TabConfig[] = [
    { name: 'index',       title: 'Home',       icon: 'home-outline',              activeIcon: 'home' },
    { name: 'cocktails',   title: 'Cocktails',  icon: 'wine-outline',              activeIcon: 'wine' },
    { name: 'pantry',      title: 'Pantry',     icon: 'file-tray-stacked-outline', activeIcon: 'file-tray-stacked' },
    { name: 'planner',     title: 'Plan',       icon: 'calendar-outline',          activeIcon: 'calendar' },
    { name: 'ingredients', title: 'Cellar',     icon: 'beaker-outline',            activeIcon: 'beaker' },
    { name: 'profile',     title: 'Profile',    icon: 'person-circle-outline',     activeIcon: 'person-circle' },
]

const PRIMARY_TAB_NAMES = ['index', 'cocktails', 'pantry', 'planner'] as const
const MORE_TAB_NAMES = ['ingredients', 'profile'] as const

function TabIcon({ icon, focused }: { icon: IconName; focused: boolean }) {
    return (
        <Ionicons name={icon} size={20} color={focused ? C.bronze : C.mute} />
    )
}

function FloatingTabButton({
    tab,
    focused,
    onPress,
}: {
    tab: TabConfig
    focused: boolean
    onPress: () => void
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : undefined}
            accessibilityLabel={tab.title}
            onPress={onPress}
            style={({ pressed }) => [
                s.tabButton,
                focused && s.tabButtonActive,
                pressed && s.tabButtonPressed,
            ]}
        >
            <TabIcon icon={focused ? tab.activeIcon : tab.icon} focused={focused} />
            <Text style={[s.tabLabel, focused && s.tabLabelActive]} numberOfLines={1}>
                {tab.title}
            </Text>
        </Pressable>
    )
}

function MixoTabBar(props: BottomTabBarProps) {
    const insets = useSafeAreaInsets()
    const reportAdSlot = useReportFloatingTabAdSlot()
    const [moreOpen, setMoreOpen] = useState(false)
    const activeRouteName = props.state.routes[props.state.index]?.name
    const primaryTabs = TABS.filter(t => PRIMARY_TAB_NAMES.includes(t.name as typeof PRIMARY_TAB_NAMES[number]))
    const moreTabs = TABS.filter(t => MORE_TAB_NAMES.includes(t.name as typeof MORE_TAB_NAMES[number]))
    const isMoreFocused = moreTabs.some(t => t.name === activeRouteName)

    function navigateTo(tabName: string) {
        const route = props.state.routes.find(r => r.name === tabName)
        if (!route) return

        const event = props.navigation.emit({
            type:             'tabPress',
            target:           route.key,
            canPreventDefault: true,
        })

        if (!event.defaultPrevented) {
            props.navigation.navigate(route.name, route.params)
        }
    }

    return (
        <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, FLOATING_TAB_BAR_BOTTOM_MIN) }]}>
            <View style={s.floatingBar}>
                {primaryTabs.map(tab => (
                    <FloatingTabButton
                        key={tab.name}
                        tab={tab}
                        focused={activeRouteName === tab.name}
                        onPress={() => navigateTo(tab.name)}
                    />
                ))}
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={isMoreFocused || moreOpen ? { expanded: moreOpen, selected: isMoreFocused } : { expanded: moreOpen }}
                    accessibilityLabel="More"
                    onPress={() => setMoreOpen(true)}
                    style={({ pressed }) => [
                        s.tabButton,
                        (isMoreFocused || moreOpen) && s.tabButtonActive,
                        pressed && s.tabButtonPressed,
                    ]}
                >
                    <Ionicons
                        name={isMoreFocused || moreOpen ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'}
                        size={20}
                        color={isMoreFocused || moreOpen ? C.bronze : C.mute}
                    />
                    <Text style={[s.tabLabel, (isMoreFocused || moreOpen) && s.tabLabelActive]} numberOfLines={1}>
                        More
                    </Text>
                </Pressable>
            </View>
            <AdBanner onVisibilityChange={reportAdSlot} />
            <Modal transparent visible={moreOpen} animationType="fade" onRequestClose={() => setMoreOpen(false)}>
                <Pressable style={s.menuBackdrop} onPress={() => setMoreOpen(false)}>
                    <View style={[s.moreSheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                        <View style={s.moreHandle} />
                        <View style={s.moreItems}>
                            {moreTabs.map(tab => {
                                const focused = activeRouteName === tab.name
                                return (
                                    <Pressable
                                        key={tab.name}
                                        accessibilityRole="button"
                                        accessibilityState={focused ? { selected: true } : undefined}
                                        accessibilityLabel={tab.title}
                                        onPress={() => {
                                            setMoreOpen(false)
                                            navigateTo(tab.name)
                                        }}
                                        style={({ pressed }) => [
                                            s.moreItem,
                                            focused && s.moreItemActive,
                                            pressed && s.moreItemPressed,
                                        ]}
                                    >
                                        <TabIcon icon={focused ? tab.activeIcon : tab.icon} focused={focused} />
                                        <Text style={[s.moreLabel, focused && s.moreLabelActive]}>{tab.title}</Text>
                                    </Pressable>
                                )
                            })}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    )
}

export default function TabsLayout() {
    return (
        <FloatingTabBarLayoutProvider>
        <Tabs
            tabBar={props => <MixoTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor:   C.bronze,
                tabBarInactiveTintColor: C.mute,
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    elevation: 0,
                },
                tabBarLabelStyle: {
                    fontWeight:    '700',
                    letterSpacing: 1.3,
                    textTransform: 'uppercase',
                    fontSize:      9,
                },
            }}
        >
            {TABS.map(t => (
                <Tabs.Screen
                    key={t.name}
                    name={t.name}
                    options={{
                        title: t.title,
                        tabBarIcon: ({ focused }) => <TabIcon icon={focused ? t.activeIcon : t.icon} focused={focused} />,
                    }}
                />
            ))}
        </Tabs>
        </FloatingTabBarLayoutProvider>
    )
}

const s = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        elevation: 20,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingTop: FLOATING_TAB_BAR_TOP_PADDING,
    },
    floatingBar: {
        minHeight: FLOATING_TAB_BAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(211,196,183,0.5)',
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: 'rgba(251,249,246,0.95)',
        shadowColor: '#1b1c1a',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    tabButton: {
        flex: 1,
        minWidth: 0,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: 12,
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
    tabButtonActive: {
        backgroundColor: '#e7dfd4',
    },
    tabButtonPressed: {
        backgroundColor: '#f3ece2',
    },
    tabLabel: {
        color: C.mute,
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    tabLabelActive: {
        color: C.bronze,
    },
    menuBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(27,28,26,0.14)',
    },
    moreSheet: {
        marginHorizontal: 18,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: 'rgba(211,196,183,0.9)',
        borderRadius: 16,
        paddingTop: 8,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(251,249,246,0.96)',
        shadowColor: '#1b1c1a',
        shadowOpacity: 0.16,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 12,
    },
    moreHandle: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 999,
        backgroundColor: C.borderWarm,
        marginBottom: 10,
    },
    moreItems: {
        gap: 8,
    },
    moreItem: {
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: C.cream,
    },
    moreItemActive: {
        backgroundColor: '#e7dfd4',
    },
    moreItemPressed: {
        backgroundColor: '#f3ece2',
    },
    moreLabel: {
        color: C.ink,
        fontSize: 14,
        fontWeight: '700',
    },
    moreLabelActive: {
        color: C.bronze,
    },
})
