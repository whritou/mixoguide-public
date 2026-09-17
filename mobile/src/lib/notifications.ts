import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { userApi } from '@/api/endpoints/user'
import { isRestockCandidate } from '@/lib/pantryRestock'
import type {
    PlannedCocktailDTO,
    PlannedCollectionDTO,
    UserPantryItemDTO,
} from '@mixoguide/shared'

type Notification = {
    request: {
        content: {
            data?: Record<string, unknown>
        }
    }
}

type NotificationResponse = {
    notification: Notification
}

type NotificationSubscription = {
    remove: () => void
}

type ScheduledNotificationRequest = {
    identifier?: string
    content: {
        title: string
        body: string
        data?: Record<string, unknown>
    }
    trigger: {
        type: 'date'
        date: Date
        channelId?: string
    }
}

type ScheduledNotification = {
    identifier: string
}

type NotificationsModule = {
    AndroidImportance: { HIGH: number }
    setNotificationHandler: (handler: unknown) => void
    setNotificationChannelAsync: (
        channelId: string,
        channel: {
            name: string
            importance: number
            vibrationPattern: number[]
            lightColor: string
        }
    ) => Promise<void>
    getPermissionsAsync: () => Promise<{ status: string }>
    requestPermissionsAsync: () => Promise<{ status: string }>
    getDevicePushTokenAsync: () => Promise<{ data: unknown }>
    getExpoPushTokenAsync: (options: { projectId: string }) => Promise<{ data: string }>
    addNotificationReceivedListener: (handler: (n: Notification) => void) => NotificationSubscription
    addNotificationResponseReceivedListener: (handler: (r: NotificationResponse) => void) => NotificationSubscription
    scheduleNotificationAsync: (request: ScheduledNotificationRequest) => Promise<string>
    getAllScheduledNotificationsAsync: () => Promise<ScheduledNotification[]>
    cancelScheduledNotificationAsync: (identifier: string) => Promise<void>
}

// expo-notifications push support was removed from Expo Go in SDK 53.
// Guard every call so the module is never loaded while in Expo Go.
const isExpoGo =
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo'

function getNotifications(): NotificationsModule | null {
    if (isExpoGo) return null
    // require() is lazy in Metro; module only loads on first call.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule
}

type PlannedReminderItem = {
    kind: 'cocktail' | 'event'
    title: string
    plannedFor: Date
}

export type NotificationSyncInput = {
    plannedCocktails: PlannedCocktailDTO[]
    plannedCollections: PlannedCollectionDTO[]
    pantryItems: UserPantryItemDTO[]
}

type LocalNotificationPlan = {
    identifier: string
    title: string
    body: string
    when: Date
    route: '/(tabs)/planner' | '/(tabs)/pantry'
}

const LOCAL_NOTIFICATION_PREFIX = 'mixoguide-local'
const MIN_LEAD_MS = 60 * 1000
const MAX_OVERDUE_GROUP_NOTIFICATIONS = 3
const MAX_TOTAL_LOCAL_NOTIFICATIONS = 5

let lastLocalPlanSignature: string | null = null

function parseDate(value: string): Date | null {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate()
}

function dayKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function pluralize(word: string, count: number): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`
}

function upcomingRestockReminderDate(now: Date): Date {
    const todayAt18 = new Date(now)
    todayAt18.setHours(18, 0, 0, 0)
    if (todayAt18.getTime() > now.getTime() + MIN_LEAD_MS) return todayAt18

    const tomorrowAt10 = new Date(now)
    tomorrowAt10.setDate(tomorrowAt10.getDate() + 1)
    tomorrowAt10.setHours(10, 0, 0, 0)
    return tomorrowAt10
}

function toPlannedItems(input: NotificationSyncInput): PlannedReminderItem[] {
    const items: PlannedReminderItem[] = []

    for (const cocktail of input.plannedCocktails) {
        if (cocktail.status !== 'planned') continue
        const plannedFor = parseDate(cocktail.plannedFor)
        if (!plannedFor) continue

        items.push({
            kind: 'cocktail',
            title: cocktail.cocktail?.name ?? 'Cocktail',
            plannedFor,
        })
    }

    for (const collection of input.plannedCollections) {
        if (collection.status !== 'planned') continue
        const plannedFor = parseDate(collection.plannedFor)
        if (!plannedFor) continue

        items.push({
            kind: 'event',
            title: collection.title,
            plannedFor,
        })
    }

    return items
}

export function buildLocalNotificationPlan(
    input: NotificationSyncInput,
    now = new Date()
): LocalNotificationPlan[] {
    const plannedItems = toPlannedItems(input)
    const plans: LocalNotificationPlan[] = []

    const todayPlanned = plannedItems.filter(item => sameDay(item.plannedFor, now))
    const futureTodayPlanned = todayPlanned.filter(item => item.plannedFor.getTime() > now.getTime() + MIN_LEAD_MS)

    if (futureTodayPlanned.length > 0) {
        const nextPlannedAt = new Date(
            Math.min(...futureTodayPlanned.map(item => item.plannedFor.getTime()))
        )
        const todayCocktails = todayPlanned.filter(item => item.kind === 'cocktail').length
        const todayEvents = todayPlanned.filter(item => item.kind === 'event').length
        const summaryParts = [
            todayCocktails > 0 ? pluralize('cocktail', todayCocktails) : null,
            todayEvents > 0 ? pluralize('event', todayEvents) : null,
        ].filter((part): part is string => part !== null)

        const summary = summaryParts.join(' and ')
        plans.push({
            identifier: `${LOCAL_NOTIFICATION_PREFIX}-today-${dayKey(now)}-${todayCocktails}-${todayEvents}`,
            title: "Today's planner reminder",
            body: `You have ${summary} planned today.`,
            when: nextPlannedAt,
            route: '/(tabs)/planner',
        })
    }

    const overdueGroups = new Map<string, { when: Date; cocktails: number; events: number }>()

    for (const item of plannedItems) {
        const overdueAt = startOfDay(item.plannedFor)
        overdueAt.setDate(overdueAt.getDate() + 1)
        overdueAt.setHours(10, 0, 0, 0)

        if (overdueAt.getTime() <= now.getTime() + MIN_LEAD_MS) continue

        const key = dayKey(item.plannedFor)
        const existing = overdueGroups.get(key)
        if (!existing) {
            overdueGroups.set(key, {
                when: overdueAt,
                cocktails: item.kind === 'cocktail' ? 1 : 0,
                events: item.kind === 'event' ? 1 : 0,
            })
            continue
        }

        if (item.kind === 'cocktail') existing.cocktails += 1
        else existing.events += 1
    }

    const overduePlans = Array.from(overdueGroups.entries())
        .map(([key, value]) => {
            const total = value.cocktails + value.events
            return {
                identifier: `${LOCAL_NOTIFICATION_PREFIX}-overdue-${key}-${value.cocktails}-${value.events}`,
                title: 'Planner overdue reminder',
                body: `${pluralize('planned item', total)} just became overdue.`,
                when: value.when,
                route: '/(tabs)/planner' as const,
            }
        })
        .sort((a, b) => a.when.getTime() - b.when.getTime())
        .slice(0, MAX_OVERDUE_GROUP_NOTIFICATIONS)

    plans.push(...overduePlans)

    const lowStockCount = input.pantryItems.filter(isRestockCandidate).length
    if (lowStockCount > 0) {
        const restockAt = upcomingRestockReminderDate(now)
        plans.push({
            identifier: `${LOCAL_NOTIFICATION_PREFIX}-restock-${dayKey(restockAt)}-${Math.min(lowStockCount, 99)}`,
            title: 'Pantry restock reminder',
            body: `${pluralize('item', lowStockCount)} in your pantry are running low.`,
            when: restockAt,
            route: '/(tabs)/pantry',
        })
    }

    return plans
        .sort((a, b) => a.when.getTime() - b.when.getTime())
        .slice(0, MAX_TOTAL_LOCAL_NOTIFICATIONS)
}

export async function registerForPushNotifications(): Promise<void> {
    if (Platform.OS !== 'android' || isExpoGo) return

    const N = getNotifications()!

    N.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound:  true,
            shouldSetBadge:   false,
            shouldShowBanner: true,
            shouldShowList:   true,
        }),
    })

    await N.setNotificationChannelAsync('default', {
        name:             'Default',
        importance:       N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       '#1a1a1a',
    })

    const { status: existing } = await N.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
        const { status } = await N.requestPermissionsAsync()
        finalStatus = status
    }

    if (finalStatus !== 'granted') return

    try {
        const deviceToken = await N.getDevicePushTokenAsync()
        const fcmToken = deviceToken.data as string

        let expoToken: string | undefined
        const projectId = Constants.expoConfig?.extra?.eas?.projectId
        if (typeof projectId === 'string' && projectId !== 'YOUR_EAS_PROJECT_ID') {
            const expoPushToken = await N.getExpoPushTokenAsync({ projectId })
            expoToken = expoPushToken.data
        }

        await userApi.registerDevice({
            platform:   'android',
            fcmToken,
            expoToken,
            appVersion: Constants.expoConfig?.version,
        })
    } catch {
        // Non-critical; silently ignore.
    }
}

export async function syncLocalNotifications(input: NotificationSyncInput): Promise<void> {
    if (Platform.OS !== 'android' || isExpoGo) return

    const N = getNotifications()
    if (!N) return

    const plans = buildLocalNotificationPlan(input)
    const signature = JSON.stringify(
        plans.map(plan => ({
            id: plan.identifier,
            title: plan.title,
            body: plan.body,
            when: plan.when.getTime(),
            route: plan.route,
        }))
    )

    if (signature === lastLocalPlanSignature) return
    lastLocalPlanSignature = signature

    try {
        const scheduled = await N.getAllScheduledNotificationsAsync()
        const localScheduledIds = scheduled
            .map(item => item.identifier)
            .filter(identifier => identifier.startsWith(LOCAL_NOTIFICATION_PREFIX))

        await Promise.all(
            localScheduledIds.map(identifier =>
                N.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
            )
        )

        await Promise.all(
            plans.map(plan =>
                N.scheduleNotificationAsync({
                    identifier: plan.identifier,
                    content: {
                        title: plan.title,
                        body: plan.body,
                        data: { route: plan.route },
                    },
                    trigger: {
                        type: 'date',
                        date: plan.when,
                        channelId: 'default',
                    },
                }).catch(() => '')
            )
        )
    } catch {
        // Non-critical; silently ignore.
    }
}

export async function clearLocalNotifications(): Promise<void> {
    lastLocalPlanSignature = null

    if (Platform.OS !== 'android' || isExpoGo) return

    const N = getNotifications()
    if (!N) return

    try {
        const scheduled = await N.getAllScheduledNotificationsAsync()
        const localScheduledIds = scheduled
            .map(item => item.identifier)
            .filter(identifier => identifier.startsWith(LOCAL_NOTIFICATION_PREFIX))

        await Promise.all(
            localScheduledIds.map(identifier =>
                N.cancelScheduledNotificationAsync(identifier).catch(() => undefined)
            )
        )
    } catch {
        // Non-critical; silently ignore.
    }
}

export function addNotificationReceivedListener(
    handler: (n: Notification) => void
): { remove: () => void } {
    const N = getNotifications()
    if (!N) return { remove: () => {} }
    return N.addNotificationReceivedListener(handler)
}

export function addNotificationResponseListener(
    handler: (r: NotificationResponse) => void
): { remove: () => void } {
    const N = getNotifications()
    if (!N) return { remove: () => {} }
    return N.addNotificationResponseReceivedListener(handler)
}
