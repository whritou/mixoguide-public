import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle, Animated, Easing } from 'react-native'
import { router, useSegments } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/useAuth'
import { hasCompletedFeatureTourV2, markFeatureTourV2Complete } from '@/auth/tokenStore'
import { useCocktails, useFavoriteIds } from '@/features/cocktails/hooks'
import { usePantryItems } from '@/features/pantry/hooks'
import { usePlannedCocktails, usePlannedCollections } from '@/features/planner/hooks'
import { C, F } from '@/theme/brand'
import {
    buildOnboardingPantryItems,
    hasMeaningfulOnboardingData,
    type OnboardingCocktailCandidate,
    type OnboardingPantryItem,
    type OnboardingStepId,
} from './onboardingFlow'

type IconName = ComponentProps<typeof Ionicons>['name']

export type ProductTourContextValue = {
    isActive: boolean
    step: OnboardingStepId | null
    selectedCocktailId: string | null
    plannedCocktailId: string | null
    servings: number
    stockItems: OnboardingPantryItem[]
    isStep: (id: OnboardingStepId) => boolean
    matchesCocktail: (cocktailId: string | null | undefined) => boolean
    matchesPlannedCocktail: (plannedCocktailId: string | null | undefined) => boolean
    selectCocktail: (cocktail: OnboardingCocktailCandidate) => void
    advanceFavorite: (cocktailId: string) => void
    advancePlanned: (cocktail: OnboardingCocktailCandidate, plannedCocktailId: string, servings: number) => void
    advanceStocked: () => void
    advanceMade: (plannedCocktailId: string) => Promise<void>
    restart: () => void
    skip: () => Promise<void>
    finish: () => Promise<void>
}

const noopAsync = async () => {}

const ProductTourContext = createContext<ProductTourContextValue>({
    isActive: false,
    step: null,
    selectedCocktailId: null,
    plannedCocktailId: null,
    servings: 1,
    stockItems: [],
    isStep: () => false,
    matchesCocktail: () => false,
    matchesPlannedCocktail: () => false,
    selectCocktail: () => {},
    advanceFavorite: () => {},
    advancePlanned: () => {},
    advanceStocked: () => {},
    advanceMade: noopAsync,
    restart: () => {},
    skip: noopAsync,
    finish: noopAsync,
})

const STEP_ORDER: OnboardingStepId[] = ['pick', 'favorite', 'plan', 'stock', 'make', 'done']

const STEP_META: Record<OnboardingStepId, { eyebrow: string; title: string; icon: IconName }> = {
    pick: { eyebrow: 'Start', title: 'Choose any cocktail', icon: 'wine-outline' },
    favorite: { eyebrow: 'Favorite', title: 'Save it with the heart button', icon: 'heart-outline' },
    plan: { eyebrow: 'Planner', title: 'Add it to tonight\'s plan', icon: 'calendar-outline' },
    stock: { eyebrow: 'Pantry', title: 'Add missing items to Pantry', icon: 'file-tray-stacked-outline' },
    make: { eyebrow: 'Make', title: 'Mark it as made in Planner', icon: 'checkmark-circle-outline' },
    done: { eyebrow: 'Done', title: 'You now know the core flow', icon: 'sparkles-outline' },
}

function isAuthRoute(segments: string[]) {
    return segments[0] === '(auth)' || segments[0] === 'auth'
}

function stockLabel(count: number) {
    return `${count} ingredient${count === 1 ? '' : 's'}`
}

function coachBody(step: OnboardingStepId, cocktailName: string | null, stockItems: OnboardingPantryItem[]) {
    switch (step) {
        case 'pick':
            return 'Pick any cocktail card to start.'
        case 'favorite':
            return cocktailName
                ? `On ${cocktailName}, tap the heart in the top-right corner.`
                : 'Tap the heart in the top-right corner.'
        case 'plan':
            return 'Tap Plan, keep tonight, then add it to Planner.'
        case 'stock':
            return stockItems.length > 0
                ? `Tap Manage ingredients and add ${stockLabel(stockItems.length)} to Pantry.`
                : 'Everything needed is already stocked. Continue to Planner.'
        case 'make':
            return 'In Planner, tap the check button on this cocktail.'
        case 'done':
            return 'Great run. You completed favorite, plan, stock, and make.'
    }
}

function coachAction(step: OnboardingStepId, stockItems: OnboardingPantryItem[]) {
    switch (step) {
        case 'pick':
            return 'Tap any cocktail card'
        case 'favorite':
            return 'Tap the heart button'
        case 'plan':
            return 'Tap Plan'
        case 'stock':
            return stockItems.length > 0 ? 'Tap Manage ingredients' : 'Tap Continue'
        case 'make':
            return 'Tap the check button in Planner'
        case 'done':
            return 'Tap Finish'
    }
}

async function markCompleteSilently() {
    try {
        await markFeatureTourV2Complete()
    } catch {
        // Local completion is best-effort; the user should not get stuck in the coach.
    }
}

export function ProductTourProvider({ children }: { children: ReactNode }) {
    const insets = useSafeAreaInsets()
    const segments = useSegments()
    const isOnAuthRoute = isAuthRoute(segments)
    const { user, isLoading: authLoading } = useAuth()
    const [active, setActive] = useState(false)
    const [step, setStep] = useState<OnboardingStepId>('pick')
    const [selected, setSelected] = useState<OnboardingCocktailCandidate | null>(null)
    const [servings, setServings] = useState(1)
    const [plannedCocktailId, setPlannedCocktailId] = useState<string | null>(null)
    const checkedUserRef = useRef<string | null>(null)

    const enabled = !!user
    const { data: cocktailPage, isLoading: cocktailsLoading } = useCocktails({
        includeIngredients: true,
        limit: 20,
        sortBy: 'ratingCount',
        sortOrder: 'desc',
    }, enabled)
    const { data: favoriteIds = [], isLoading: favoritesLoading } = useFavoriteIds()
    const { data: pantryItems = [], isLoading: pantryLoading } = usePantryItems(enabled)
    const { data: plannedCocktails = [], isLoading: plannedCocktailsLoading } = usePlannedCocktails(enabled)
    const { data: plannedCollections = [], isLoading: plannedCollectionsLoading } = usePlannedCollections(enabled)

    const availableCocktails = useMemo(() => cocktailPage?.data ?? [], [cocktailPage?.data])
    const stockItems = useMemo(
        () => buildOnboardingPantryItems(selected, pantryItems, servings),
        [pantryItems, selected, servings]
    )
    const queriesLoading = cocktailsLoading
        || favoritesLoading
        || pantryLoading
        || plannedCocktailsLoading
        || plannedCollectionsLoading

    const startTour = useCallback(() => {
        setActive(true)
        setStep('pick')
        setSelected(null)
        setServings(1)
        setPlannedCocktailId(null)
    }, [])

    useEffect(() => {
        if (!user) {
            checkedUserRef.current = null
            setActive(false)
        }
    }, [user])

    useEffect(() => {
        if (
            authLoading
            || !user
            || active
            || isOnAuthRoute
            || queriesLoading
            || checkedUserRef.current === user.id
        ) {
            return
        }

        let cancelled = false

        hasCompletedFeatureTourV2()
            .then(done => {
                if (cancelled) return
                checkedUserRef.current = user.id
                if (done) return
                if (availableCocktails.length === 0) return
                if (hasMeaningfulOnboardingData({ favoriteIds, pantryItems, plannedCocktails, plannedCollections })) return
                startTour()
                router.replace('/(tabs)/cocktails')
            })
            .catch(() => {
                checkedUserRef.current = user.id
            })

        return () => {
            cancelled = true
        }
    }, [
        active,
        authLoading,
        availableCocktails.length,
        favoriteIds,
        isOnAuthRoute,
        pantryItems,
        plannedCocktails,
        plannedCollections,
        queriesLoading,
        startTour,
        user,
    ])

    const restart = useCallback(() => {
        startTour()
        router.replace('/(tabs)/cocktails')
    }, [startTour])

    const skip = useCallback(async () => {
        setActive(false)
        await markCompleteSilently()
    }, [])

    const finish = useCallback(async () => {
        setActive(false)
        await markCompleteSilently()
    }, [])

    const isStep = useCallback((id: OnboardingStepId) => active && step === id, [active, step])

    const matchesCocktail = useCallback((cocktailId: string | null | undefined) => (
        active && !!cocktailId && selected?.id === cocktailId
    ), [active, selected])

    const matchesPlannedCocktail = useCallback((id: string | null | undefined) => (
        active && !!id && plannedCocktailId === id
    ), [active, plannedCocktailId])

    const selectCocktail = useCallback((cocktail: OnboardingCocktailCandidate) => {
        if (!active || step !== 'pick') return
        setSelected(cocktail)
        setStep('favorite')
        router.push(`/cocktail/${cocktail.id}`)
    }, [active, step])

    const advanceFavorite = useCallback((cocktailId: string) => {
        if (!active || step !== 'favorite' || selected?.id !== cocktailId) return
        setStep('plan')
    }, [active, selected, step])

    const advancePlanned = useCallback((cocktail: OnboardingCocktailCandidate, id: string, nextServings: number) => {
        if (!active || step !== 'plan') return
        if (selected && selected.id !== cocktail.id) return
        setSelected(cocktail)
        setPlannedCocktailId(id)
        setServings(Math.max(1, nextServings))
        setStep('stock')
    }, [active, selected, step])

    const advanceStocked = useCallback(() => {
        if (!active || step !== 'stock') return
        setStep('make')
        router.replace('/(tabs)/planner')
    }, [active, step])

    const advanceMade = useCallback(async (id: string) => {
        if (!active || step !== 'make' || plannedCocktailId !== id) return
        setStep('done')
        await markCompleteSilently()
    }, [active, plannedCocktailId, step])

    const value = useMemo<ProductTourContextValue>(() => ({
        isActive: active,
        step: active ? step : null,
        selectedCocktailId: selected?.id ?? null,
        plannedCocktailId,
        servings,
        stockItems,
        isStep,
        matchesCocktail,
        matchesPlannedCocktail,
        selectCocktail,
        advanceFavorite,
        advancePlanned,
        advanceStocked,
        advanceMade,
        restart,
        skip,
        finish,
    }), [
        active,
        advanceFavorite,
        advanceMade,
        advancePlanned,
        advanceStocked,
        finish,
        isStep,
        matchesCocktail,
        matchesPlannedCocktail,
        plannedCocktailId,
        restart,
        selectCocktail,
        servings,
        skip,
        step,
        stockItems,
        selected?.id,
    ])

    const currentStepNumber = STEP_ORDER.indexOf(step) + 1
    const meta = STEP_META[step]
    const placementStyle = step === 'plan' || step === 'stock' || step === 'make'
        ? s.overlayTop
        : s.overlayBottom

    return (
        <ProductTourContext.Provider value={value}>
            {children}
            {active ? (
                <View
                    pointerEvents="box-none"
                    style={[
                        s.overlay,
                        placementStyle,
                        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
                    ]}
                >
                    <View pointerEvents="auto" style={s.coachCard}>
                        <View style={s.coachTop}>
                            <View style={s.coachTitleRow}>
                                <View style={s.iconCircle}>
                                    <Ionicons name={meta.icon} size={16} color={C.bronze} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.eyebrow}>{meta.eyebrow}</Text>
                                    <Text style={s.title}>{meta.title}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => { void skip() }}
                                accessibilityRole="button"
                                accessibilityLabel="Skip onboarding tour"
                                hitSlop={8}
                            >
                                <Text style={s.skipText}>Skip</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.bodyText}>
                            {coachBody(step, selected?.name ?? null, stockItems)}
                        </Text>
                        <View style={s.actionPill}>
                            <Ionicons name="flash-outline" size={12} color={C.bronze} />
                            <Text style={s.actionPillText}>{coachAction(step, stockItems)}</Text>
                        </View>

                        <View style={s.footerRow}>
                            <Text style={s.progressText}>{currentStepNumber}/{STEP_ORDER.length}</Text>
                            <View style={s.progressTrack}>
                                <View style={[s.progressFill, { width: `${(currentStepNumber / STEP_ORDER.length) * 100}%` }]} />
                            </View>
                            {step === 'stock' && stockItems.length === 0 ? (
                                <TouchableOpacity
                                    style={s.inlineAction}
                                    onPress={advanceStocked}
                                    accessibilityRole="button"
                                    accessibilityLabel="Continue onboarding tour"
                                >
                                    <Text style={s.inlineActionText}>Continue</Text>
                                </TouchableOpacity>
                            ) : null}
                            {step === 'done' ? (
                                <TouchableOpacity
                                    style={s.inlineAction}
                                    onPress={() => { void finish() }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Finish onboarding tour"
                                >
                                    <Text style={s.inlineActionText}>Finish</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                </View>
            ) : null}
        </ProductTourContext.Provider>
    )
}

export function useProductTour() {
    return useContext(ProductTourContext)
}

export function TourTargetHint({
    active,
    children,
    style,
}: {
    active: boolean
    children: ReactNode
    style?: StyleProp<ViewStyle>
}) {
    const pulse = useRef(new Animated.Value(1)).current

    useEffect(() => {
        if (!active) return

        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1.12,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        )

        animation.start()

        return () => animation.stop()
    }, [active])

    return (
        <View
            pointerEvents="box-none"
            style={[active && s.targetWrap, style]}
        >
            {children}

            {active && (
                <>
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            s.outerGlow,
                            {
                                transform: [{ scale: pulse }],
                            },
                        ]}
                    />

                    <Animated.View
                        pointerEvents="none"
                        style={[
                            s.middleGlow,
                            {
                                transform: [{ scale: pulse }],
                            },
                        ]}
                    />

                    <Animated.View
                        pointerEvents="none"
                        style={[
                            s.targetRing,
                            {
                                transform: [{ scale: pulse }],
                            },
                        ]}
                    />
                </>
            )}
        </View>
    )
}

const s = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        paddingHorizontal: 12,
    },
    overlayTop: {
        justifyContent: 'flex-start',
    },
    overlayBottom: {
        justifyContent: 'flex-end',
    },
    coachCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.borderWarm,
        backgroundColor: C.card,
        padding: 14,
        gap: 10,
        shadowColor: C.ink,
        shadowOpacity: 0.16,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 18,
    },
    coachTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
    },
    coachTitleRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 13,
        backgroundColor: C.creamWarm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eyebrow: {
        fontFamily: F.mono,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: C.bronze,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        color: C.ink,
        marginTop: 2,
    },
    skipText: {
        fontSize: 12,
        fontWeight: '700',
        color: C.mute,
        paddingTop: 2,
    },
    bodyText: {
        fontSize: 13,
        color: C.mute,
        lineHeight: 19,
    },
    actionPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.creamWarm,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: C.borderWarm,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    actionPillText: {
        fontFamily: F.mono,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: C.bronze,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    progressText: {
        fontFamily: F.mono,
        fontSize: 10,
        fontWeight: '800',
        color: C.mute,
    },
    progressTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        overflow: 'hidden',
    },
    progressFill: {
        height: 4,
        borderRadius: 2,
        backgroundColor: C.bronze,
    },
    inlineAction: {
        height: 34,
        borderRadius: 17,
        backgroundColor: C.bronze,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineActionText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: '#f5ece0',
    },
    targetWrap: {
        position: 'relative',
        overflow: 'visible',
    },

    outerGlow: {
        position: 'absolute',
        top: -24,
        right: -24,
        bottom: -24,
        left: -24,
        borderRadius: 35,

        backgroundColor: `${C.bronze}15`,
    },

    middleGlow: {
        position: 'absolute',
        top: -16,
        right: -16,
        bottom: -16,
        left: -16,
        borderRadius: 28,

        backgroundColor: `${C.bronze}30`,
    },

    targetRing: {
        position: 'absolute',
        top: -8,
        right: -8,
        bottom: -8,
        left: -8,

        borderRadius: 20,
        borderWidth: 4,
        borderColor: C.bronze,

        shadowColor: C.bronze,
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 25,
    },
})
