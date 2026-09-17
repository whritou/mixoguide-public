import * as SecureStore from 'expo-secure-store'
import { Linking, Platform } from 'react-native'
import { showGlobalActionDialog } from '@/components/ui/ActionDialog'
import {
    applyPositiveAction,
    normalizeRatePromptState,
    schedulePrompt,
    shouldPromptForRating,
    type RatePromptState,
} from '@/lib/ratePromptPolicy'

const RATE_PROMPT_KEY = 'mg_rate_prompt_state_v1'
const PLAY_STORE_PACKAGE = 'com.mixoguide.app'

let actionQueue: Promise<void> = Promise.resolve()
let promptOpen = false

async function readState(): Promise<RatePromptState> {
    try {
        const raw = await SecureStore.getItemAsync(RATE_PROMPT_KEY)
        if (!raw) return normalizeRatePromptState(null)
        return normalizeRatePromptState(JSON.parse(raw))
    } catch {
        return normalizeRatePromptState(null)
    }
}

async function writeState(state: RatePromptState): Promise<void> {
    try {
        await SecureStore.setItemAsync(RATE_PROMPT_KEY, JSON.stringify(state))
    } catch {
        // Best effort only; rating prompts must never block core flows.
    }
}

function enqueue(task: () => Promise<void>): Promise<void> {
    actionQueue = actionQueue.then(task).catch(() => undefined)
    return actionQueue
}

async function setOptOut(optedOut: boolean): Promise<void> {
    await enqueue(async () => {
        const state = await readState()
        if (state.optedOut === optedOut) return
        await writeState({ ...state, optedOut })
    })
}

async function openPlayStorePage(): Promise<void> {
    const marketUrl = `market://details?id=${PLAY_STORE_PACKAGE}`
    const webUrl = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`

    try {
        if (await Linking.canOpenURL(marketUrl)) {
            await Linking.openURL(marketUrl)
            return
        }
    } catch {
        // Fall through to web URL.
    }

    try {
        await Linking.openURL(webUrl)
    } catch {
        // Ignore; this is a non-critical action.
    }
}

function closePrompt() {
    promptOpen = false
}

function showRatePrompt() {
    if (promptOpen) return
    promptOpen = true

    showGlobalActionDialog({
        title:          'Enjoying MixoGuide?',
        message:        'Like MixoGuide? If it helps your home bar, would you mind rating us on Google Play?',
        confirmLabel:   'Rate MixoGuide',
        cancelLabel:    'Later',
        secondaryLabel: 'No thanks',
        secondaryTone:  'danger',
        icon:           'star-outline',
        onDismiss:      closePrompt,
        onSecondary:    () => {
            closePrompt()
            void setOptOut(true)
        },
        onConfirm:      () => {
            closePrompt()
            void setOptOut(true)
            void openPlayStorePage()
        },
    })
}

export function noteRatePromptEligibleAction(): Promise<void> {
    if (Platform.OS !== 'android') return Promise.resolve()

    return enqueue(async () => {
        const nowMs = Date.now()
        const nextState = applyPositiveAction(await readState(), nowMs)

        if (!shouldPromptForRating(nextState, nowMs)) {
            await writeState(nextState)
            return
        }

        const scheduledState = schedulePrompt(nextState, nowMs)
        await writeState(scheduledState)
        showRatePrompt()
    })
}
